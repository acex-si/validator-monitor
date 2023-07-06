import axios from 'axios';
import { CronJob } from 'cron';
import { Mutex } from 'async-mutex';
import { GetCurrentValidatorsResponse, ValidatorResponse } from '../types/avalanche';
import { ValidatorNodeDataItem } from '../types/tools';
import { DashboardManager } from './grafana-tools';
import { Injectable, Logger } from '@nestjs/common';
import { Configuration } from './config';
import PrometheusRegistry from './prometheus';
import { AverageCollector } from '../tools/utils';


interface DelegatorMetricsData {
    stakeAmount: number; // getValidators returns a string, not a number
}

interface ValidatorMetricsData {
    connected: AverageCollector;
    startTime: number;
    endTime: number;
    uptime: AverageCollector;
    stakeAmount: number;
    delegators: DelegatorMetricsData[];
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
                    md.connected.add(v.connected ? 1 : 0);
                    md.uptime.add(Number(v.uptime));
                } else {
                    let delegators: DelegatorMetricsData[] = [];
                    if (v.delegators) {
                        delegators = v.delegators.map(d => ({
                            stakeAmount: Number(d.stakeAmount) * 1e-9,
                        }));
                    }
                    metricsData.set(v.nodeID, {
                        connected: new AverageCollector().add(v.connected ? 1 : 0),
                        startTime: Number(v.startTime),
                        endTime: Number(v.endTime),
                        uptime: new AverageCollector().add(Number(v.uptime)),
                        stakeAmount: Number(v.stakeAmount) * 1e-9,
                        delegators: delegators,
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
        this.registry.validatorUptime.reset();
        this.registry.validatorStake.reset();
        this.registry.validatorDelegationStake.reset();
        for (const [nodeID, md] of metricsData.entries()) {
            const startTime = md.startTime * 1000;
            const endTime = md.endTime * 1000;
            const delegatorStakeAmount = md.delegators.reduce((a, b) => a + b.stakeAmount, 0);

            // Update metrics
            this.registry.connectedCounter.set({ 'NodeID': nodeID }, md.connected.average() > 0.5 ? 1 : 0);
            this.registry.validatorStartTime.set({ 'NodeID': nodeID }, startTime);
            this.registry.validatorEndTime.set({ 'NodeID': nodeID }, endTime);
            this.registry.validatorUptime.set({ 'NodeID': nodeID }, md.uptime.average());
            this.registry.validatorStake.set({ 'NodeID': nodeID }, md.stakeAmount);
            this.registry.validatorDelegationStake.set({ 'NodeID': nodeID }, delegatorStakeAmount);

            // Check if node is new
            const vnd = this.validatorNodeData.get(nodeID);
            if (!vnd) {
                this.validatorNodeData.set(nodeID, {
                    nodeId: nodeID,
                    name: '',
                    startTime: startTime,
                    endTime: endTime,
                    stakeAmount: md.stakeAmount,
                    delegatorStakeAmount: delegatorStakeAmount,
                });
                Logger.log(`Started watching validator ${nodeID}`);
                nodesChanged = true;
            } else if (vnd.startTime != startTime || vnd.endTime != endTime || vnd.stakeAmount != md.stakeAmount || vnd.delegatorStakeAmount != delegatorStakeAmount) {
                vnd.startTime = startTime;
                vnd.endTime = endTime;
                vnd.stakeAmount = md.stakeAmount;
                vnd.delegatorStakeAmount = delegatorStakeAmount;
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
