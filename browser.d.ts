export type BrowserRpcRequest = (method: string, params: unknown[]) => Promise<unknown>;

export interface GlApiHost {
  $rpcRequest?: BrowserRpcRequest;
  $request?: BrowserRpcRequest;
  glApi?: Record<string, unknown>;
}

export declare function createGlApi(
  rpc: BrowserRpcRequest
): Record<string, unknown>;

export declare function resolveRpcRequest(host: GlApiHost): BrowserRpcRequest;

export declare const glApiMixin: {
  beforeCreate(this: GlApiHost): void;
};
