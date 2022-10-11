import * as dotenv from 'dotenv'
import { PrometheusDriver, SampleValue } from 'prometheus-query';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers'

dotenv.config();

const driver = new PrometheusDriver({
    endpoint: process.env.PROMETHEUS_URL,
});

async function runAnalyze(nodeId: string, from: Date, to: Date) {
    const step = 30; // seconds

    const queryResult = await driver.rangeQuery(`validators_connected{NodeID="${nodeId}"}`, from, to, step);
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

const args = yargs(hideBin(process.argv))
    .command('Metrics analyzer', 'Analyze metrics for a given node')
    .option('nodeId', { alias: 'n', type: 'string', description: 'Id of the validator node', demandOption: true })
    .option('from', { type: 'string', description: 'Time to calculate metrics - from', demandOption: true} )
    .option('to', { type: 'string', description: 'Time to calculate metrics - to'})
    .parseSync();

runAnalyze(args.nodeId, new Date(args.from), new Date(args.to))
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

