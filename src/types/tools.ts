
// Types for tools
// ------------------------------------------------------------------------------------------------

export interface ValidatorNodeDataItem {

    /**
     * Node ID of the validator
     */
    nodeId: string;

    /**
     * Name of the validator (currently not used)
     */
    name: string;

    /**
     * Timestamp of the validator start (unix timestamp in seconds)
     */
    startTime: number;

    /**
     * Timestamp of the validator end (unix timestamp in seconds)
     */
    endTime: number;
}
