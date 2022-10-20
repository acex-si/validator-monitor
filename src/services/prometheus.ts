import { Gauge, Registry } from 'prom-client';
import { Injectable } from '@nestjs/common';


@Injectable()
export class PrometheusRegistry {

    private registry: Registry;
    public readonly connectedCounter: Gauge;
    public readonly nodeAvailable: Gauge;

    constructor() {
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

    metrics(): Promise<string> {
        return this.registry.metrics();
    }

    contentType(): string {
        return this.registry.contentType;
    }
}
