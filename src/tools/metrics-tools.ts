import fs from 'fs';
import prometheus from 'prom-client';
import axios from 'axios';
import { CronJob } from 'cron';
import { Mutex } from 'async-mutex';
import logger from '../logger';
import { GetCurrentValidatorsResponse, ValidatorResponse } from '../types/avalanche';
import { ValidatorNodeDataItem } from '../types/tools';
import { dashboardManager } from './grafana-tools';


// Prometheus metrics definition
// ------------------------------------------------------------------------------------------------
const registry = new prometheus.Registry();

const connectedCounter = new prometheus.Gauge({
    name: 'validators_connected',
    help: 'Connected validators',
    labelNames: ['NodeID'],
});
registry.registerMetric(connectedCounter);

const nodeAvailable = new prometheus.Gauge({
    name: 'node_available',
    help: 'Is node available',
    labelNames: ['NodeURL'],
});
registry.registerMetric(nodeAvailable);


// Metrics parsing
// ------------------------------------------------------------------------------------------------


interface UptimeManagerParams {
    /**
     * A list of avalanche urls providing uptimes (by calling listValidators API)
     */
    nodeURLs: string[],

    /**
     * A list of initial validator nodes (id, name), can be empty if fetched from URL
     */
    validatorNodes: ValidatorNodeDataItem[],

    /**
     * Cron string to initialize uptime fetching cronjob
     */
    cronString?: string,

    /**
     * URL for periodically updating validator nodes
     */
    refreshUrl?: string,

    /**
     * Cron string for periodically updating validator nodes
     */
     refreshCronString?: string,
}


class UptimeManager {

    private updateLock = new Mutex();
    private cron: CronJob;
    private refreshCron: CronJob;
    private readonly nodeURLs: string[];
    private validatorNodeData: Map<string, ValidatorNodeDataItem>;
    private validatorNodeIDs: Set<string>;
    private refreshUrl: string;

    constructor({ nodeURLs, validatorNodes, cronString = '*/10 * * * * *', refreshCronString, refreshUrl }: UptimeManagerParams) {
        this.nodeURLs = nodeURLs;
        this.updateValidatorData(validatorNodes);
        this.cron = new CronJob({
            cronTime: cronString,
            onTick: () => { this.update(); }
        });
        this.cron.start();
        if (refreshCronString && refreshUrl) {
            this.refreshUrl = refreshUrl;
            this.refreshCron = new CronJob({
                cronTime: refreshCronString,
                onTick: () => { this.updateValidators(); }
            });
            this.refreshCron.start();
            this.updateValidators();
        }
    }

    private updateValidatorData(validatorNodes: ValidatorNodeDataItem[]) {
        this.validatorNodeData = new Map<string, ValidatorNodeDataItem>();
        this.validatorNodeIDs = new Set<string>();
        for (const v of validatorNodes) {
            if (!v.nodeId) {
                continue;
            }
            logger.info(`Watching validator ${v.nodeId} with name ${v.name}`);
            this.validatorNodeIDs.add(v.nodeId);
            this.validatorNodeData.set(v.nodeId, v);
        }
    }

    // Returns a map from node url to the data; maps to null in the case when the node was not accessible
    private async callGetCurrentValidators(): Promise<Map<string, ValidatorResponse[]>>  {
        const result = new Map<string, ValidatorResponse[]>();
        for (const nodeURL of this.nodeURLs) {
            try {
                const response = await axios.post<GetCurrentValidatorsResponse>(`${nodeURL}/ext/bc/P`, {
                    'jsonrpc': '2.0',
                    'method': 'platform.getCurrentValidators',
                    'params': {},
                    'id': 1
                });
                result.set(nodeURL, response.data.result.validators);
            } catch (e) {
                logger.warn(`Node with url ${nodeURL} is not accessible`);
                result.set(nodeURL, null);
            }
        }
        return result;
    }

    async update() {
        logger.debug('Updating metrics');
        const responses = await this.callGetCurrentValidators();

        const release = await this.updateLock.acquire();
        try {
            if (Array.from(responses.values()).some(v => v !== null)) {
                this.updateMetrics(responses);
            }
        } finally {
            release();
        };
    }

    private updateMetrics(responses: Map<string, ValidatorResponse[]>) {
        const connected = new Map<string, boolean>(); // nodeID -> connected
        for (const [url, response] of responses.entries()) {

            if (response == null) {
                nodeAvailable.set({ 'NodeURL': url }, 0);
                continue;
            }
            nodeAvailable.set({ 'NodeURL': url }, 1);

            for (const v of response) {
                if (!this.validatorNodeIDs.has(v.nodeID)) {
                    continue;
                }
                connected.set(v.nodeID, v.connected || Boolean(connected.get(v.nodeID)))
            }
        }

        connectedCounter.reset();
        for (const nodeID of this.validatorNodeIDs) {
            const counterVal = connected.get(nodeID) ? 1 : 0;
            connectedCounter.set({ 'NodeID': nodeID }, counterVal);
        }
    }

    private async updateValidators() {
        const release = await this.updateLock.acquire();
        try {
            const newValidators = await axios.get<ValidatorNodeDataItem[]>(this.refreshUrl);
            logger.info('Refreshed validators');
            this.updateValidatorData(newValidators.data);
            if (this.validatorNodeIDs.size === 0) {
                logger.warn(`No nodes to watch, check URL ${this.refreshUrl}`);
            }
        } finally {
            release();
        }
        // Don't need to call with await; it can be done asynchronously...
        dashboardManager.update([...this.validatorNodeData.values()]);
    }

    async getMetrics() {
        await this.updateLock.waitForUnlock();
        return await registry.metrics();
    }
}


// Initialization
// ------------------------------------------------------------------------------------------------

function getAvalancheNodeURLs(): string[] {
    if (process.env.AVALANCHE_NODE_URLS) {
        const urls = process.env.AVALANCHE_NODE_URLS
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0);
        if (urls.length > 0) {
            return urls;
        }
    }
    logger.error('Invalid AVALANCHE_NODE_URLS parameter');
    return [];
}

function getValidatorIDs(): ValidatorNodeDataItem[] {
    if (!process.env.VALIDATORS_FILE) {
        return []
    }
    const file = fs.readFileSync(process.env.VALIDATORS_FILE, 'utf8');
    const vData: ValidatorNodeDataItem[] = JSON.parse(file);
    return vData;
}

function getCronString() {
    const step: number = parseInt(process.env.STEP_SECONDS) || 10;
    return `*/${step} * * * * *`;
}

const manager = new UptimeManager({
    nodeURLs: getAvalancheNodeURLs(),
    validatorNodes: getValidatorIDs(),
    cronString: getCronString(),
    refreshUrl: process.env.VALIDATORS_URL,
    refreshCronString: process.env.VALIDATORS_REFRESH_CRON,
});


// Exported functions
// ------------------------------------------------------------------------------------------------

export function getContentType() {
    return registry.contentType;
}

export async function getMetrics() {
    return manager.getMetrics();
}
