import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrometheusDriver } from 'prometheus-query';
import { toPrometheusTime } from '../tools/time';
import { UptimeResponse } from '../types/aggregations';
import { Configuration } from './config';

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
        Logger.log('Initializing AggregationsManager 1')
        await delay(1000)
        Logger.log('Initializing AggregationsManager 2')
    }

    async runAnalyze(nodeId: string, from: Date, to: Date): Promise<UptimeResponse> {
        const now = Date.now();
        const duration = to.getTime() - from.getTime();
        // const offset = Math.max(now - to.getTime(), 0);

        if (duration <= 0) {
            throw new HttpException('Invalid duration', HttpStatus.BAD_REQUEST);
        }


        const durationStr = toPrometheusTime(duration);
        // const offsetStr = offset > 0 ? (' offset ' + toPrometheusTime(offset)) : '';
        // const query =`avg_over_time(validators_connected{NodeID="${nodeId}"}[${durationStr}]${offsetStr})`;
        const query = `avg_over_time(validators_connected{NodeID="${nodeId}"}[${durationStr}])`;

        Logger.log(`Running query '${query}' at ${to}`);

        const queryResult = await this.driver.instantQuery(query, to);

        if (!queryResult.result || queryResult.result.length == 0) {
            return { uptime: null };
        }
        return {
            uptime: queryResult.result[0].value.value
        };
    }

}
