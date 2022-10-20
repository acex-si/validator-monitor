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
     * A list of initial validator nodes (id, name), can be empty if fetched from URL
     */
    validatorNodes: ValidatorNodeDataItem[] = [];

    /**
     * Cron string to initialize uptime fetching cronjob
     */
    cronString: string;

    /**
     * URL for periodically updating validator nodes
     */
    refreshUrl: string;

    /**
     * Cron string for periodically updating validator nodes
     */
    refreshCronString: string;

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
        this.initValidatorIDs();
        this.initCronString();
        this.refreshUrl = this.configService.get<string>('VALIDATORS_URL');
        this.refreshCronString = this.configService.get<string>('VALIDATORS_REFRESH_CRON');
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

    private initValidatorIDs() {
        const envValidatorsFile = this.configService.get<string>('VALIDATORS_FILE');
        if (envValidatorsFile) {
            const file = fs.readFileSync(envValidatorsFile, 'utf8');
            this.validatorNodes = JSON.parse(file);
        }
    }

    private initCronString() {
        const step: number = parseInt(this.configService.get<string>('VALIDATORS_FILE')) || 10;
        this.cronString = `*/${step} * * * * *`;
    }
}
