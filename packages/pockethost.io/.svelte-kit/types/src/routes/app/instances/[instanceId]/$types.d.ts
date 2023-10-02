import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type RouteParams = { instanceId: string }
type RouteId = '/app/instances/[instanceId]';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type PageParentData = Omit<EnsureDefined<import('../../../$types.js').LayoutData>, keyof LayoutData> & EnsureDefined<LayoutData>;
type LayoutRouteId = RouteId | "/app/instances/[instanceId]"
type LayoutParams = RouteParams & { instanceId?: string }
type LayoutParentData = EnsureDefined<import('../../../$types.js').LayoutData>;

export type EntryGenerator = () => Promise<Array<RouteParams>> | Array<RouteParams>;
export type PageServerData = null;
export type PageData = Expand<PageParentData>;
export type LayoutServerData = null;
export type LayoutData = Expand<LayoutParentData>;