export default class Bucket {
  private _capacity: number;
  private _consumed: number;
  private _interval: number;
  private _refilled: Date;

  constructor(
    capacity: number = 1000,
    interval: number = 1000,
    now: Date = new Date(),
  ) {
    if (capacity < 0) {
      throw new Error("capacity cannot be negative");
    }
    if (interval < 0) {
      throw new Error("interval cannot be negative");
    }

    this._capacity = capacity;
    this._consumed = capacity;
    this._interval = interval;
    this._refilled = now;
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get interval(): number {
    return this._interval;
  }

  public get consumed(): number {
    return this._consumed;
  }

  public get refilled(): Date {
    return this._refilled;
  }

  private refill(now: Date): void {
    const elapsed = now.getTime() - this._refilled.getTime();
    const release = Math.floor(elapsed / this._interval);

    if (release > 0) {
      this._consumed = Math.max(0, this._consumed - release);
      this._refilled = new Date(
        this._refilled.getTime() + release * this._interval,
      );
    }
  }

  public consume(now: Date = new Date()): boolean {
    this.refill(now);

    if (this._consumed < this._capacity) {
      this._consumed++;
      return true;
    }
    return false;
  }
}
