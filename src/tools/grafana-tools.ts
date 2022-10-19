import fs from 'fs';
import axios from 'axios';
import logger from '../logger';
import { ValidatorNodeDataItem } from "../types/tools";

interface DashboardManagerParams {
    /**
     * Url of the template
     */
    templateUrl: string;

    /**
     * Destination for the dashboard (file in the folder where Grafana periodically checks for dashboard updates)
     */
     dashboardPath: string;
}


class DashboardManager {

    private readonly templateUrl: string;
    private readonly dashboardPath: string;

    constructor({ templateUrl, dashboardPath }: DashboardManagerParams) {
        this.templateUrl = templateUrl;
        this.dashboardPath = dashboardPath;
    }

    private async readTemplate(): Promise<any> {
        try {
            const response = await axios.get<any>(this.templateUrl);
            if (!response.data) {
                logger.info(`Empty template on ${this.templateUrl}`);
            }
            return response.data;
        } catch (e) {
            logger.error(`Error fetching grafana template from ${this.templateUrl}, ${e}`)
            return null;
        }
    }

    private dashboardFromTemplate(template: any, nodes: ValidatorNodeDataItem[]): void {
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
        if (!this.templateUrl || !this.dashboardPath) {
            return;
        }

        const template = await this.readTemplate();
        if (!template) {
            return;
        }

        try {
            this.dashboardFromTemplate(template, nodes);
            fs.writeFileSync(this.dashboardPath, JSON.stringify(template), 'utf-8');
        } catch (e) {
            logger.error(`Error generating dashboard, ${e}`);
        }
    }
}

export const dashboardManager = new DashboardManager({
    templateUrl: process.env.GRAFANA_DASHBOARD_TEMPLATE_URL,
    dashboardPath: process.env.GRAFANA_DASHBOARD_PATH,
});
