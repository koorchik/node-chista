/**
 * PaymentsProcess service demonstrating cleanup on failure.
 *
 * Uses afterError hook to rollback side effects (inventory reservation) when payment fails.
 */

import type { InferFromSchema } from 'livr/types';
import { RunContext } from '../../../src/ServiceBase.js';
import { ServiceError } from '../../../src/ServiceError.js';
import { Base } from './Base.js';

const paymentProcessValidation = {
  orderId: ['required', 'string'],
  amount: ['required', 'positive_decimal'],
  cardToken: ['required', 'string']
} as const;

type PaymentProcessInput = InferFromSchema<typeof paymentProcessValidation>;

interface PaymentProcessOutput {
  transactionId: string;
}

export class PaymentsProcess extends Base<PaymentProcessInput, PaymentProcessOutput> {
  static validation = paymentProcessValidation;

  private reservationId: string | null = null;

  async checkPermissions(): Promise<boolean> {
    return true;
  }

  async execute(data: PaymentProcessInput): Promise<PaymentProcessOutput> {
    // Step 1: Reserve inventory (side effect)
    this.reservationId = `res-${Date.now()}`;
    console.log(`[${this.constructor.name}] Reserved inventory: ${this.reservationId}`);

    // Step 2: Process payment (might fail)
    if (data.cardToken === 'invalid-token') {
      throw new ServiceError({
        code: 'PAYMENT_FAILED',
        fields: { cardToken: 'CARD_DECLINED' }
      });
    }

    return { transactionId: `txn-${Date.now()}` };
  }

  // Clean up reservation if payment fails
  protected override async afterError(
    error: unknown,
    context: RunContext<PaymentProcessInput>
  ): Promise<void> {
    if (this.reservationId) {
      console.log(`[${this.constructor.name}] Rolling back reservation: ${this.reservationId}`);
      this.reservationId = null;
    }
  }
}
