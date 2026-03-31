import type { PublisherAdapter } from "@kora/publishing-core";

export class AdapterRegistry {
  private readonly byProvider = new Map<string, PublisherAdapter>();

  register(adapter: PublisherAdapter) {
    this.byProvider.set(adapter.provider, adapter);
  }

  get(provider: string): PublisherAdapter {
    const adapter = this.byProvider.get(provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${provider}`);
    }
    return adapter;
  }
}
