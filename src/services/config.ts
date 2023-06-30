import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatorNodeDataItem } from '../types/tools';


@Injectable()
export class Configuration {

    /**
     * A list of avalanche urls providing uptimes (by calling listValidators API)
     */
    nodeURLs: string[] = [];

    /**
     * Cron string to initialize uptime fetching cronjob
     */
    cronString: string;

    /**
     * Grafana dashboard template url
     */
    dashboardTemplateUrl: string;

    /**
     * Grafana dashboard destination path
     * (file in the folder where Grafana periodically checks for dashboard updates)
     */
    dashboardPath: string;

    /**
     * Url of prometheus service
     */
    prometheusUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.initNodeURLs();
        this.initCronString();
        this.dashboardPath = this.configService.get<string>('GRAFANA_DASHBOARD_PATH');
        this.dashboardTemplateUrl = this.configService.get<string>('GRAFANA_DASHBOARD_TEMPLATE_URL');
        this.prometheusUrl = this.configService.get<string>('PROMETHEUS_URL');
    }


    private initNodeURLs() {
        const envNodeURLs = this.configService.get<string>('AVALANCHE_NODE_URLS');

        if (envNodeURLs) {
            this.nodeURLs = envNodeURLs
                .split(',')
                .map(url => url.trim())
                .filter(url => url.length > 0);
        }
        if (this.nodeURLs.length === 0) {
            Logger.error('Invalid AVALANCHE_NODE_URLS parameter');
        }
    }

    private initCronString() {
        const step: number = parseInt(this.configService.get<string>('STEP_SECONDS')) || 10;
        this.cronString = `*/${step} * * * * *`;
    }
}
