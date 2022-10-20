
// Types for for avalanche apis
// ------------------------------------------------------------------------------------------------

export interface ValidatorResponse {
    nodeID: string,
    stakeAmount: string,
    uptime: string,
    connected: boolean,
}

export interface GetCurrentValidatorsResponse {
    result: {
        validators: ValidatorResponse[],
    }
}

