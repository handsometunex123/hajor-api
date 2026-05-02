export interface ProviderAdapterEvent {
  event: string;
  data: any;
  raw?: any;
}

export interface ProviderAdapter {
  verifySignature(rawBody: string, signatureHeader?: string): boolean;
  handleEvent(evt: ProviderAdapterEvent): Promise<any>;
}
