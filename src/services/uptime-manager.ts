import axios from 'axios';
import { CronJob } from 'cron';
import { Mutex } from 'async-mutex';
import { GetCurrentValidatorsResponse, ValidatorResponse } from '../types/avalanche';
import { ValidatorNodeDataItem } from '../types/tools';
import { DashboardManager } from './grafana-tools';
import { Injectable, Logger } from '@nestjs/common';
import { Configuration } from './config';
import PrometheusRegistry from './prometheus';


interface ValidatorMetricsData {
    connected: boolean;
    startTime: number;
    endTime: number;
}


@Injectable()
export class UptimeManager {

    private updateLock = new Mutex();
    private cron: CronJob;
    private validatorNodeData: Map<string, ValidatorNodeDataItem> = new Map<string, ValidatorNodeDataItem>();

    constructor(private readonly config: Configuration,
                private readonly registry: PrometheusRegistry,
                private readonly dashboardManager: DashboardManager) {
        this.cron = new CronJob({
            cronTime: config.cronString,
            onTick: () => { this.update(); }
        });
        this.cron.start();
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
            this.updateMetrics(responses);
        } finally {
            release();
        };
    }

    private updateMetrics(responses: Map<string, ValidatorResponse[]>) {
        const metricsData = new Map<string, ValidatorMetricsData>(); // nodeID -> { connected, startTime, endTime }
        let hasValidResponse = false;

        for (const [url, response] of responses.entries()) {
            if (response == null) {
                this.registry.nodeAvailable.set({ 'NodeURL': url }, 0);
                continue;
            }
            this.registry.nodeAvailable.set({ 'NodeURL': url }, 1);

            for (const v of response) {
                const md = metricsData.get(v.nodeID)
                if (md) {
                    md.connected = md.connected || Boolean(v.connected);
                } else {
                    metricsData.set(v.nodeID, {
                        connected: Boolean(v.connected),
                        startTime: Number(v.startTime),
                        endTime: Number(v.endTime)
                    });
                }
            }
            hasValidResponse = true;
        }

        // Reset counters
        if (!hasValidResponse) {
            Logger.warn('No valid responses from nodes. Skipping metrics update');
            return;
        }

        let nodesChanged = false;
        this.registry.connectedCounter.reset();
        this.registry.validatorStartTime.reset();
        this.registry.validatorEndTime.reset();
        for (const [nodeID, md] of metricsData.entries()) {
            const startTime = md.startTime * 1000;
            const endTime = md.endTime * 1000;

            // Update metrics
            this.registry.connectedCounter.set({ 'NodeID': nodeID }, md.connected ? 1 : 0);
            this.registry.validatorStartTime.set({ 'NodeID': nodeID }, startTime);
            this.registry.validatorEndTime.set({ 'NodeID': nodeID }, endTime);

            // Check if node is new
            const vnd = this.validatorNodeData.get(nodeID);
            if (!vnd) {
                this.validatorNodeData.set(nodeID, {
                    nodeId: nodeID,
                    name: '',
                    startTime: startTime,
                    endTime: endTime,
                });
                Logger.log(`Started watching validator ${nodeID}`);
                nodesChanged = true;
            } else if (vnd.startTime != startTime || vnd.endTime != endTime) {
                vnd.startTime = startTime;
                vnd.endTime = endTime;
                nodesChanged = true;
            }
        }
        // Check if node was removed
        for (const nodeID of this.validatorNodeData.keys()) {
            if (!metricsData.has(nodeID)) {
                this.validatorNodeData.delete(nodeID);
                Logger.log(`Stopped watching validator ${nodeID}`);
                nodesChanged = true;
            }
        }

        // Update dashboard
        if (nodesChanged) {
            this.dashboardManager.update([...this.validatorNodeData.values()]);
        }
    }

    async getMetrics(): Promise<string> {
        await this.updateLock.waitForUnlock();
        return await this.registry.metrics();
    }

    getMetricsContentType(): string {
        return this.registry.contentType();
    }
}
