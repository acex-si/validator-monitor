
export class AverageCollector {
    private sum = 0;
    private count = 0;

    add(value: number): AverageCollector {
        this.sum += value;
        this.count++;
        return this;
    }

    average(): number {
        return this.sum / this.count;
    }
}
