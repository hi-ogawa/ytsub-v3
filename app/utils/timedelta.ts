// similar api to python's timdelta https://docs.python.org/3/library/datetime.html
// originally from https://github.com/hi-ogawa/ytsub-v2/blob/ec8902209d9a7b733bd6550e05d9df9fa478c1e8/src/utils/datetime.ts

export type TimedeltaOptions = Partial<
  Record<"days" | "hours" | "minutes" | "seconds" | "milliseconds", number>
>;

export class Timedelta {
  // milliseconds
  constructor(private value: number) {}

  static make({
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
  }: TimedeltaOptions): Timedelta {
    const value =
      (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000 +
      milliseconds;
    return new Timedelta(value);
  }

  add(other: Timedelta): Timedelta {
    return new Timedelta(this.value + other.value);
  }

  sub(other: Timedelta): Timedelta {
    return new Timedelta(this.value - other.value);
  }

  mul(scale: number): Timedelta {
    return new Timedelta(this.value * scale);
  }

  div(scale: number): Timedelta {
    return new Timedelta(this.value / scale);
  }

  radd(date: Date): Date {
    return new Date(date.getTime() + this.value);
  }

  rsub(date: Date): Date {
    return this.neg().radd(date);
  }

  neg(): Timedelta {
    return new Timedelta(-this.value);
  }
}
