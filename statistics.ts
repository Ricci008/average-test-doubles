export function mean(numbers: Array<number>): number {
  const sum = numbers.reduce((acc, x) => acc + x, 0);
  return sum / numbers.length;
}

export function median(numbers: Array<number>): number {
  const sorted = [...numbers].toSorted((a, b) => a - b);
  const n = sorted.length;
  if (n == 0) {
    return Number.NaN;
  } else if (n % 2 == 0) {
    return (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0;
  } else {
    return sorted[Math.floor(n / 2)];
  }
}

export function mode(numbers: Array<number>): Array<number> {
  if (numbers.length == 0) {
    return [];
  }
  const freqs: Map<number, number> = new Map();
  for (const x of numbers) {
    if (freqs.has(x)) {
      const old = freqs.get(x) || 0;
      freqs.set(x, old + 1);
    } else {
      freqs.set(x, 1);
    }
  }
  const maxFreq = [...freqs.values()].reduce((acc, x) => (x > acc ? x : acc));
  const mostFrequent = [...freqs.entries()].filter(([_, v]) => v == maxFreq);
  return [...mostFrequent.map(([k, _]) => k)];
}
