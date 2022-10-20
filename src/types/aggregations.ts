
// Types for aggregations response
// ------------------------------------------------------------------------------------------------

export interface UptimeRequest {
    nodeID: string;
    from: Date;
    to: Date;
}

export interface UptimResponseItem {
    nodeID: string;
    uptime: number;
}

export interface UptimeResponse {
    uptime: number;
}

