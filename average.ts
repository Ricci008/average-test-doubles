import { NumberProvider } from "./number_provider.ts";
import { mean, median, mode } from "./statistics.ts";

export class Average {
  constructor(private numberProvider: NumberProvider) {}

  public async computeMeanOfFile(): Promise<number> {
    const numbers: Array<number> = await this.numberProvider.readNumbers();
    return mean(numbers);
  }

  public async computeMedianOfFile(): Promise<number> {
    const numbers: Array<number> = await this.numberProvider.readNumbers();
    return median(numbers);
  }

  public async computeModeOfFile(): Promise<Array<number>> {
    const numbers: Array<number> = await this.numberProvider.readNumbers();
    return mode(numbers);
  }
}
