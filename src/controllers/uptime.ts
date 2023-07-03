import { ClassSerializerInterceptor, Controller, Get, Logger, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AggregationsManager } from '../services/aggregations-manager';
import { ConnectedRequest, ConnectedResponse, UptimeRequest, UptimeResponse, ValidatorInfoResponse } from '../types/aggregations';

@ApiTags('Aggregations')
@Controller('aggregations')
export class AggregationsController {

    constructor(private readonly aggregations: AggregationsManager) {
    }

    @ApiOperation({ summary: 'Get estimated uptime (based on prometheus monitoring) of a specific node for the given interval' })
    @Get('uptime')
    async validatorUptime(@Query() req: UptimeRequest): Promise<UptimeResponse | null> {
        return this.aggregations.averageValidatorUptime(req.nodeID, req.from, req.to);
    }

    @ApiOperation({ summary: 'Check if a validator node was connected (based on prometheus monitoring) at specific time'})
    @Get('connected')
    async validatorConnected(@Query() req: ConnectedRequest): Promise<ConnectedResponse | null> {
        return this.aggregations.validatorConnectedAt(req.nodeID, req.at);
    }

    @ApiOperation({ summary: 'Get node info: start time, end time and uptime at specific time (based on prometheus monitoring)'})
    @Get('info')
    async validatorInfo(@Query() req: ConnectedRequest): Promise<ValidatorInfoResponse | null> {
        return this.aggregations.validatorInfoAt(req.nodeID, req.at);
    }

}
