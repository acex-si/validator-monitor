import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrometheusDriver } from 'prometheus-query';
import { toPrometheusTime } from '../tools/time';
import { ConnectedResponse, UptimeResponse, ValidatorInfoResponse } from '../types/aggregations';
import { Configuration } from './config';
import { parseQueryResult } from '../tools/queries';

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

@Injectable()
export class AggregationsManager implements OnModuleInit {

    private driver: PrometheusDriver;

    constructor(private readonly config: Configuration) {
        Logger.log('Constructing AggregationsManager')
        this.driver = new PrometheusDriver({
            endpoint: config.prometheusUrl,
        });
    }

    async onModuleInit() {
        Logger.log('Initializing AggregationsManager')
    }

    async averageValidatorUptime(nodeId: string, from: Date, to: Date): Promise<UptimeResponse | null> {
        // const now = Date.now();
        const duration = to.getTime() - from.getTime();
        if (duration <= 0) {
            throw new HttpException('Invalid duration', HttpStatus.BAD_REQUEST);
        }

        const durationStr = toPrometheusTime(duration);
        // const offset = Math.max(now - to.getTime(), 0);
        // const offsetStr = offset > 0 ? (' offset ' + toPrometheusTime(offset)) : '';
        // const query =`avg_over_time(validators_connected{NodeID="${nodeId}"}[${durationStr}]${offsetStr})`;
        const query =`avg_over_time(validators_connected{NodeID="${nodeId}"}[${durationStr}])`;

        Logger.log(`Running query '${query}' at ${to}`);

        const queryResult = await this.driver.instantQuery(query, to);
        const value = parseQueryResult<number>(queryResult)
        return value ? { uptime: value } : null;
    }

    async validatorConnectedAt(nodeId: string, at: Date): Promise<ConnectedResponse | null> {
        const query =`validators_connected{NodeID="${nodeId}"}`;

        Logger.log(`Running query '${query}' at ${at}`);

        const queryResult = await this.driver.instantQuery(query, at);
        const value = parseQueryResult(queryResult, Boolean)
        return value ? { connected: value } : null;
    }

    async validatorInfoAt(nodeId: string, at: Date): Promise<ValidatorInfoResponse | null> {
        let query =`validators_start_time{NodeID="${nodeId}"}`;
        let queryResult = await this.driver.instantQuery(query, at);
        const startTime = parseQueryResult(queryResult, v => new Date(v))
        if (!startTime) {
            return null;
        }

        query =`validators_end_time{NodeID="${nodeId}"}`;
        queryResult = await this.driver.instantQuery(query, at);
        const endTime = parseQueryResult(queryResult, v => new Date(v))
        if (!endTime) {
            return null;
        }

        const duration = endTime.getTime() - startTime.getTime();
        const durationStr = toPrometheusTime(duration);
        query =`avg_over_time(validators_connected{NodeID="${nodeId}"}[${durationStr}])`;
        queryResult = await this.driver.instantQuery(query, endTime);
        const average = parseQueryResult<number>(queryResult)
        if (!average) {
            return null;
        }
        return {
            nodeID: nodeId,
            startTime: startTime,
            endTime: endTime,
            uptime: average
        }
    }

}
