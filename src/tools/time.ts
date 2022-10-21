
/**
 * @param diff Time difference in milliseconds
 * @returns Time difference string in "Prometheus" format rounded to seconds, e.g., 1d3h5m30s
 */
 export function toPrometheusTime(diff: number): string {
    diff = Math.round(diff / 1000);
    const diffS = diff % 60;
    diff = Math.floor(diff / 60);
    const diffM = diff % 60;
    diff = Math.floor(diff / 60);
    const diffH = diff % 24;
    const diffD = Math.floor(diff / 24);

    let res = '';
    if (diffD > 0) res += diffD + 'd';
    if (diffH > 0) res += diffH + 'h';
    if (diffM > 0) res += diffM + 'm';
    if (diffS > 0) res += diffS + 's';
    return res ?? '0s';
}
