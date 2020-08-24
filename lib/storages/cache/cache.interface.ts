export interface Cache {
  set(key: string, value: string, expire?: number): boolean | Promise<boolean>;
  has(key: string): boolean | Promise<boolean>;
  get(key: string): string | Promise<string>;
  remove(key: string): boolean | Promise<boolean>;
}
