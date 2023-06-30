
// Types for for avalanche apis
// ------------------------------------------------------------------------------------------------

export interface ValidatorResponse {
    nodeID: string;
    stakeAmount: string;
    uptime: string;
    connected: boolean;
    startTime: string;
    endTime: string;
}

export interface GetCurrentValidatorsResponse {
    result: {
        validators: ValidatorResponse[];
    }
}

