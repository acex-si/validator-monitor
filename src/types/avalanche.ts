
// Types for for avalanche apis
// ------------------------------------------------------------------------------------------------

export interface DelegatorResponse {
    stakeAmount: string;
}

export interface ValidatorResponse {
    nodeID: string;
    stakeAmount: string;
    uptime: string;
    connected: boolean;
    startTime: string;
    endTime: string;
    delegators?: DelegatorResponse[];
}

export interface GetCurrentValidatorsResponse {
    result: {
        validators: ValidatorResponse[];
    }
}

