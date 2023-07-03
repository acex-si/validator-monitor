import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { ValidatorNodeDataItem } from "../types/tools";
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Configuration } from './config';


@Injectable()
export class DashboardManager implements OnModuleInit {

    constructor(private readonly config: Configuration) {
        Logger.log('Constructing DashboardManager')
    }

    onModuleInit() {
        Logger.log('Initializing DashboardManager')
    }

    private async readTemplateFromUrl(): Promise<any> {
        try {
            const response = await axios.get<any>(this.config.dashboardTemplateUrl);
            if (!response.data) {
                Logger.log(`Empty template on ${this.config.dashboardTemplateUrl}`);
            }
            return response.data;
        } catch (e) {
            Logger.error(`Error fetching grafana template from ${this.config.dashboardTemplateUrl}, ${e}`)
            return null;
        }
    }

    private modifyGridDashboardTemplate(template: any, nodes: ValidatorNodeDataItem[]): void {
        const panels = template.panels;
        const panelAll = panels[0];
        const panelNode = panels[1];

        const newPanels = [panelAll];
        let gridPosX = panelNode.gridPos.x;
        let gridPosY = panelNode.gridPos.y;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const panelCopy = JSON.parse(JSON.stringify(panelNode));
            let expr = panelCopy.targets[0].expr;

            expr = expr.replace(/NodeID="(.*?)"/, `NodeID="${node.nodeId}"`);
            panelCopy.targets[0].expr = expr;
            panelCopy.title = `Uptime of ${node.name || node.nodeId}`;
            panelCopy.id = i + 2;
            panelCopy.gridPos.x = gridPosX;
            panelCopy.gridPos.y = gridPosY;
            newPanels.push(panelCopy);

            gridPosX += panelNode.gridPos.w;
            if (gridPosX > 24) {
                gridPosX = 0;
                gridPosY += panelNode.gridPos.h;
            }
        }
        template.panels = newPanels;
    }

    async update(nodes: ValidatorNodeDataItem[]) {
        if ((this.config.dashboardTemplateFiles.length === 0 && !this.config.dashboardConnectedTemplateFile) || !this.config.dashboardPath) {
            return;
        }

        try {
            const template = fs.readFileSync(this.config.dashboardConnectedTemplateFile, 'utf-8');
            const templateObj = JSON.parse(template);
            this.modifyGridDashboardTemplate(templateObj, nodes);
            this.writeDashboardTemplate(this.config.dashboardConnectedTemplateFile, JSON.stringify(templateObj));
        } catch (e) {
            Logger.error(`Error generating connected validators dashboard, ${e}`);
        }

        for (const templateFilename of this.config.dashboardTemplateFiles) {
            try {
                const template = fs.readFileSync(templateFilename, 'utf-8');
                // Potential modification of the template (dashboard) here
                this.writeDashboardTemplate(templateFilename, template);
            } catch (e) {
                Logger.error(`Error generating dashboard, ${e}`);
            }
        }
    }

    writeDashboardTemplate(pathname: string, template: string) {
        const filename = path.basename(pathname);
        const outFile = path.join(this.config.dashboardPath, filename);
        fs.writeFileSync(outFile, template, 'utf-8');
    }

}
