import { Injectable } from '@nestjs/common';
import { PricingCatalog } from './pricing-catalog';

@Injectable()
export class CostCalculator {
  constructor(private readonly catalog: PricingCatalog) {}

  /**
   * Calculates the estimated cost of an AI provider completion in USD.
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.catalog.resolvePricing(model);
    const inputCost = (promptTokens / 1000000) * pricing.inputPricePerM;
    const outputCost = (completionTokens / 1000000) * pricing.outputPricePerM;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
