// Base for future LLM providers that aren't wired up yet. Every method throws
// NotConfiguredError. When implemented, each provider will produce candidate text
// and run it through the SAME uniqueness + BrandGuardian pipeline as the mock.
import { NotConfiguredError } from '../types';
import type { ContentProvider, ProviderOutput } from './types';
import type { ProviderName } from '../cost';

export abstract class UnconfiguredProvider implements ContentProvider {
  abstract readonly name: ProviderName;

  protected fail(): never {
    throw new NotConfiguredError(
      `The ${this.name} provider is not configured yet. When wired up (behind a serverless function so the API key never ships to the browser), it will run through the same uniqueness + BrandGuardian pipeline as the mock provider.`,
    );
  }

  async generateContent(): Promise<ProviderOutput<never>> {
    return this.fail();
  }
  async generateScript(): Promise<ProviderOutput<never>> {
    return this.fail();
  }
  async generateReviewResponse(): Promise<ProviderOutput<never>> {
    return this.fail();
  }
  async generateSocialReply(): Promise<ProviderOutput<never>> {
    return this.fail();
  }
  async repurposeContent(): Promise<ProviderOutput<never>> {
    return this.fail();
  }
}
