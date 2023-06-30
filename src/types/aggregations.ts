import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate } from 'class-validator';

// Types for aggregations response
// ------------------------------------------------------------------------------------------------


export class UptimeRequest {
    @ApiProperty({ description: 'Node ID' })
    nodeID: string;

    @ApiProperty({ description: 'Start of the interval' })
    @Type(() => Date)
    @IsDate()
    from: Date;

    @ApiProperty({ description: 'End of the interval' })
    @Type(() => Date)
    @IsDate()
    to: Date;
}


export class ConnectedRequest {
    @ApiProperty({ description: 'Node ID' })
    nodeID: string;

    @ApiProperty({ description: 'Start of the interval' })
    @Type(() => Date)
    @IsDate()
    at: Date;
}

export interface UptimeResponseItem {
    nodeID: string;
    uptime: number;
}

export interface UptimeResponse {
    uptime: number;
}

export interface ConnectedResponse {
    connected: boolean;
}

export interface ValidatorInfoResponse {
    nodeID: string;
    startTime: Date;
    endTime: Date;
    uptime: number;
}
