import { Controller, Get, Response } from '@nestjs/common';
import { Response as Res } from 'express';
import { UptimeManager } from '../services/uptime-manager';

@Controller('metrics')
export class MetricsController {

    constructor(private readonly uptimeManager: UptimeManager) {
    }

    @Get('uptime')
    async uptime(@Response() res: Res) {
        res.set('Content-Type', this.uptimeManager.getMetricsContentType());
        res.send(await this.uptimeManager.getMetrics());
    }
}
