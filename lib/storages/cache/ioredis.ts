import { Cache } from './cache.interface';
import * as IORedis from 'ioredis';

export class IoRedis implements Cache {
  private readonly SUCCESS = 'OK';
  private readonly EXPIRE = 'EX';

  constructor(public readonly client: IORedis.Redis) {}

  async set(key: string, value: string, expire?: number): Promise<boolean> {
    if (!expire) {
      return (await this.client.set(key, value)) === this.SUCCESS;
    }

    return (
      (await this.client.set(key, value, this.EXPIRE, expire)) === this.SUCCESS
    );
  }

  async has(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async get(key: string): Promise<string> {
    return this.client.get(key);
  }

  async remove(key: string): Promise<boolean> {
    return (await this.client.del(key)) === 1;
  }
}
