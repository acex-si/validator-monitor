import { Gauge, Registry } from 'prom-client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';


@Injectable()
export default class PrometheusRegistry implements OnModuleInit {

    private registry: Registry;
    public readonly connectedCounter: Gauge;
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
