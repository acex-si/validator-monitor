import { Gauge, Registry } from 'prom-client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';


@Injectable()
export default class PrometheusRegistry implements OnModuleInit {

    private registry: Registry;
    public readonly connectedCounter: Gauge;
    public readonly validatorStartTime: Gauge;
    public readonly validatorEndTime: Gauge;
    public readonly nodeAvailable: Gauge;

    constructor() {
        Logger.log('Constructing PrometheusRegistry')

        this.registry = new Registry();

        this.connectedCounter = new Gauge({
            name: 'validators_connected',
            help: 'Connected validators',
            labelNames: ['NodeID'],
        });
        this.registry.registerMetric(this.connectedCounter);

        this.validatorStartTime = new Gauge({
            name: 'validators_start_time',
            help: 'Validators start time (millis)',
            labelNames: ['NodeID'],
        });
        this.registry.registerMetric(this.validatorStartTime);

        this.validatorEndTime = new Gauge({
            name: 'validators_end_time',
            help: 'Validators end time (millis)',
            labelNames: ['NodeID'],
        });
        this.registry.registerMetric(this.validatorEndTime);

        this.nodeAvailable = new Gauge({
            name: 'node_available',
            help: 'Is node available',
            labelNames: ['NodeURL'],
        });
        this.registry.registerMetric(this.nodeAvailable);
    }

    onModuleInit() {
        Logger.log('Initializing PrometheusRegistry')
    }

    metrics(): Promise<string> {
        return this.registry.metrics();
    }

    contentType(): string {
        return this.registry.contentType;
    }
}
