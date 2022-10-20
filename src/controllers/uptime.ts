import { Controller, Get, Query, Response } from '@nestjs/common';
import { Response as Res } from 'express';
import { AggregationsManager } from '../services/aggregations-manager';
import { UptimeManager } from '../services/uptime-manager';
import { UptimeRequest, UptimeResponse } from '../types/aggregations';

@Controller('aggregations')
export class AggregationsController {

    constructor(private readonly aggregations: AggregationsManager) {
    }

    @Get('uptime')
    async uptime(@Query() req: UptimeRequest): Promise<UptimeResponse> {
        this.aggregations.runAnalyze(req.nodeID, req.from, req.to);
        return null;
    }
}
