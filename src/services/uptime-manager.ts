import axios from 'axios';
import { CronJob } from 'cron';
import { Mutex } from 'async-mutex';
import { GetCurrentValidatorsResponse, ValidatorResponse } from '../types/avalanche';
import { ValidatorNodeDataItem } from '../types/tools';
import { DashboardManager } from './grafana-tools';
import { Injectable, Logger } from '@nestjs/common';
import { Configuration } from './config';
import { PrometheusRegistry } from './prometheus';


@Injectable()
export class UptimeManager {

    private updateLock = new Mutex();
    private cron: CronJob;
    private refreshCron: CronJob;
    private validatorNodeData: Map<string, ValidatorNodeDataItem>;
    private validatorNodeIDs: Set<string>;

    constructor(private readonly config: Configuration,
                private readonly registry: PrometheusRegistry,
                private readonly dashboardManager: DashboardManager) {
        this.updateValidatorData(config.validatorNodes);
        this.cron = new CronJob({
            cronTime: config.cronString,
            onTick: () => { this.update(); }
        });
        this.cron.start();
        if (config.refreshCronString && config.refreshUrl) {
            this.refreshCron = new CronJob({
                cronTime: config.refreshCronString,
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
            Logger.log(`Watching validator ${v.nodeId} with name ${v.name}`);
            this.validatorNodeIDs.add(v.nodeId);
            this.validatorNodeData.set(v.nodeId, v);
        }
    }

    // Returns a map from node url to the data; maps to null in the case when the node was not accessible
    private async callGetCurrentValidators(): Promise<Map<string, ValidatorResponse[]>>  {
        const result = new Map<string, ValidatorResponse[]>();
        for (const nodeURL of this.config.nodeURLs) {
            try {
                const response = await axios.post<GetCurrentValidatorsResponse>(`${nodeURL}/ext/bc/P`, {
                    'jsonrpc': '2.0',
                    'method': 'platform.getCurrentValidators',
                    'params': {},
                    'id': 1
                });
                result.set(nodeURL, response.data.result.validators);
            } catch (e) {
                Logger.warn(`Node with url ${nodeURL} is not accessible`);
                result.set(nodeURL, null);
            }
        }
        return result;
    }

    async update() {
        Logger.debug('Updating metrics');
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
                this.registry.nodeAvailable.set({ 'NodeURL': url }, 0);
                continue;
            }
            this.registry.nodeAvailable.set({ 'NodeURL': url }, 1);

            for (const v of response) {
                if (!this.validatorNodeIDs.has(v.nodeID)) {
                    continue;
                }
                connected.set(v.nodeID, v.connected || Boolean(connected.get(v.nodeID)))
            }
        }

        this.registry.connectedCounter.reset();
        for (const nodeID of this.validatorNodeIDs) {
            const counterVal = connected.get(nodeID) ? 1 : 0;
            this.registry.connectedCounter.set({ 'NodeID': nodeID }, counterVal);
        }
    }

    private async updateValidators() {
        const release = await this.updateLock.acquire();
        try {
            const newValidators = await axios.get<ValidatorNodeDataItem[]>(this.config.refreshUrl);
            Logger.log('Refreshed validators');
            this.updateValidatorData(newValidators.data);
            if (this.validatorNodeIDs.size === 0) {
                Logger.warn(`No nodes to watch, check URL ${this.config.refreshUrl}`);
            }
        } catch (e) {
            Logger.error(`Error getting ${this.config.refreshUrl}`);
        } finally {
            release();
        }
        // Don't need to call with await; it can be done asynchronously...
        this.dashboardManager.update([...this.validatorNodeData.values()]);
    }

    async getMetrics(): Promise<string> {
        await this.updateLock.waitForUnlock();
        return await this.registry.metrics();
    }

    getMetricsContentType(): string {
        return this.registry.contentType();
    }
}
