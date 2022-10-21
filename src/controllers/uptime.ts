import { ClassSerializerInterceptor, Controller, Get, Logger, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AggregationsManager } from '../services/aggregations-manager';
import { UptimeRequest, UptimeResponse } from '../types/aggregations';

@ApiTags('Aggregations')
@Controller('aggregations')
export class AggregationsController {

    constructor(private readonly aggregations: AggregationsManager) {
    }

    @ApiOperation({ summary: 'Get etimated uptime (based on prometheus monitoring) of a specific node for the giver interval' })
    @Get('uptime')
    async uptime(@Query() req: UptimeRequest) /*: Promise<UptimeResponse> */ {
        // Logger.log('Node id ' + req.nodeID + ' ' + req.from);
        return this.aggregations.runAnalyze(req.nodeID, req.from, req.to);
    }

}
