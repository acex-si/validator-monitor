import fs from 'fs';
import prometheus from 'prom-client';
import axios from 'axios';
import { CronJob } from 'cron';
import { Mutex } from 'async-mutex';
import logger from '../logger';
import { GetCurrentValidatorsResponse, ValidatorResponse } from '../types/avalanche';


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
    nodeURLs: string[],
    validatorNodeIDs: string[],
    cronString?: string,
}

class UptimeManager {

    private updateLock = new Mutex();
    private cron: CronJob;
    private readonly nodeURLs: string[];
    private readonly validatorNodeIDs: Set<string>;

    constructor({ nodeURLs, validatorNodeIDs, cronString = '*/10 * * * * *'}: UptimeManagerParams) {
        this.nodeURLs = nodeURLs;
        this.validatorNodeIDs = new Set<string>(validatorNodeIDs);
        this.cron = new CronJob({
            cronTime: cronString,
            onTick: () => { this.update(); }
        });
        this.cron.start();
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

interface ValidatorData {
    nodeId: string;
}

function getValidatorIDs(): string[] {
    const file = fs.readFileSync(process.env.VALIDATORS_FILE, 'utf8');
    const vData: ValidatorData[] = JSON.parse(file);
    const response = vData.map(v => v.nodeId).filter(s => s.length > 0);

    if (response.length === 0) {
        logger.warn(`No nodes to watch, check file ${process.env.VALIDATORS_FILE}`);
    } else {
        response.forEach(id => logger.info(`Watching validator ${id}`));
    }
    return response;
}

function getCronString() {
    const step: number = parseInt(process.env.STEP_SECONDS) || 10;
    return `*/${step} * * * * *`;
}

const manager = new UptimeManager({
    nodeURLs: getAvalancheNodeURLs(),
    validatorNodeIDs: getValidatorIDs(),
    cronString: getCronString()
});


// Exported functions
// ------------------------------------------------------------------------------------------------

export function getContentType() {
    return registry.contentType;
}

export async function getMetrics() {
    return manager.getMetrics();
}
