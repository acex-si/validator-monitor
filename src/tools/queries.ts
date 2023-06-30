import { QueryResult } from "prometheus-query";

export function parseQueryResult<T>(queryResult: QueryResult, transformer?: (v: any) => T): T | null {
    if (!queryResult.result || queryResult.result.length == 0) {
        return null;
    }
    if (transformer) {
        return transformer(queryResult.result[0].value.value);
    } else {
        return queryResult.result[0].value.value;
    }
}
