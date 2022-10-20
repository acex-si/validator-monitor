import { Injectable } from '@nestjs/common';
import { PrometheusDriver, SampleValue } from 'prometheus-query';
import { Configuration } from './config';


@Injectable()
export class AggregationsManager {

    private driver: PrometheusDriver;

    constructor(private readonly config: Configuration) {
        this.driver = new PrometheusDriver({
            endpoint: config.prometheusUrl,
        });
    }

    async runAnalyze(nodeId: string, from: Date, to: Date) {
        const step = 30; // seconds

        const queryResult = await this.driver.rangeQuery(`validators_connected{NodeID="${nodeId}"}`, from, to, step);
        console.log(queryResult);
        const result = queryResult.result[0];
        const values: SampleValue[] = result.values;

        if (!values || values.length <= 1) {
            console.log('Empty or just one value returned');
            return;
        }
        const count = values.reduce((v, s) => s.value + v, 0);
        const uptimePercentage = count / values.length;
        console.log('Uptime percentage', uptimePercentage);
    }

}
