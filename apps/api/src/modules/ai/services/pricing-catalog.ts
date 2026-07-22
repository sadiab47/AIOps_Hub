import { Injectable } from '@nestjs/common';

export interface ModelPricing {
  inputPricePerM: number;  // Price in USD per 1M input tokens
  outputPricePerM: number; // Price in USD per 1M output tokens
}

@Injectable()
export class PricingCatalog {
  private readonly catalog: Record<string, ModelPricing> = {
    'gpt-4o-mini': {
      inputPricePerM: 0.150,
      outputPricePerM: 0.600,
    },
    'gpt-4o': {
      inputPricePerM: 5.000,
      outputPricePerM: 15.000,
    },
    'claude-3-5-sonnet': {
      inputPricePerM: 3.000,
      outputPricePerM: 15.000,
    },
    'claude-3-5-haiku': {
      inputPricePerM: 0.250,
      outputPricePerM: 1.250,
    },
  };

  /**
   * Resolves the pricing schema for a specific model key (case-insensitive).
   * Fallback is free (0.0).
   */
  resolvePricing(model: string): ModelPricing {
    const key = model.toLowerCase();
    for (const modelKey of Object.keys(this.catalog)) {
      if (key.includes(modelKey)) {
        return this.catalog[modelKey];
      }
    }
    return { inputPricePerM: 0.0, outputPricePerM: 0.0 };
  }
}
