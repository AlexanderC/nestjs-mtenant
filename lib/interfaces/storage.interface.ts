export interface TenantEntity<T> {
  tenant: string;
  settings: T;
}

export interface Storage<T> {
  add(tenant: string, settings?: T): Promise<TenantEntity<T>>;
  remove(tenant: string): Promise<number>;
  exists(tenant: string): Promise<Boolean>;
  updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>>;
  get(tenant?: string): Promise<TenantEntity<T> | Array<TenantEntity<T>>>;
}
