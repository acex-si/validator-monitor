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
     * Grafana dashboard template url, not used, in favor of dashboardTemplateFiles
     */
    dashboardTemplateUrl: string;

    /**
     * Grafana dashboard template file for connected validators (grid)
     */
    dashboardConnectedTemplateFile: string;

    /**
     * Grafana dashboard template files for other metrics (no transformations)
     */
    dashboardTemplateFiles: string[] = [];

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
        this.initDashboardTemplates();
        this.dashboardPath = this.configService.get<string>('GRAFANA_DASHBOARD_PATH');
        this.prometheusUrl = this.configService.get<string>('PROMETHEUS_URL');
    }

    private initDashboardTemplates() {
        this.dashboardConnectedTemplateFile = this.configService.get<string>('GRAFANA_DASHBOARD_CONNECTED_TEMPLATE_FILE');

        const envDashboardTemplateFiles = this.configService.get<string>('GRAFANA_DASHBOARD_TEMPLATE_FILES');
        if (envDashboardTemplateFiles) {
            this.dashboardTemplateFiles = envDashboardTemplateFiles
                .split(',')
                .map(fn => fn.trim())
                .filter(fn => fn.length > 0);
        }
        if (this.dashboardTemplateFiles.length === 0) {
            Logger.warn('No dashboard template files specified');
        }
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
