export default class Bucket {
  private _capacity: number;
  private _interval: number;
  private _storage: any;

  constructor(redis: any, capacity: number = 1000, interval: number = 1000) {
    if (capacity < 0) throw new Error("capacity cannot be negative");
    if (interval < 0) throw new Error("interval cannot be negative");

    this._capacity = capacity;
    this._interval = interval;
    this._storage = redis;
  }

  public get capacity(): number {
    return this._capacity;
  }

  public get interval(): number {
    return this._interval;
  }

  private async get(key: string, now: Date) {
    const raw = await this._storage.get(`bucket:${key}`);

    if (!raw) {
      return { consumed: 0, refilled: now.getTime() };
    }

    const bucket = JSON.parse(raw);
    const release = Math.floor((now.getTime() - bucket.refilled) / this._interval);

    if (release > 0) {
      bucket.consumed = Math.max(0, bucket.consumed - release);
      bucket.refilled = bucket.refilled + release * this._interval;
    }

    return bucket;
  }

  private async save(key: string, state: any): Promise<void> {
    const ttl = Math.ceil((this._capacity * this._interval) / 1000) + 60;
    await this._storage.set(`bucket:${key}`, JSON.stringify(state), { EX: ttl });
  }

  public async consume(key: string, now: Date = new Date()): Promise<boolean> {
    const state = await this.get(key, now);
    const allowed = state.consumed < this._capacity;

    if (allowed) {
      state.consumed++;
    }

    await this.save(key, state);
    return allowed;
  }
}
