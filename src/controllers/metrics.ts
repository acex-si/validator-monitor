import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UptimeManager } from '../services/uptime-manager';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {

    constructor(private readonly uptimeManager: UptimeManager) {
    }

    @ApiOperation({ summary: 'Get metrics for Prometheus' })
    @Get('uptime')
    async uptime(@Res() res: Response) {
        res.set('Content-Type', this.uptimeManager.getMetricsContentType());
        res.send(await this.uptimeManager.getMetrics());
    }
}
