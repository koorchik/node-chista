/**
 * OrdersCreate service demonstrating event publishing on success.
 *
 * Uses afterSuccess hook to publish domain events after order creation.
 */

import type { InferFromSchema } from 'livr/types';
import { RunContext } from '../../../src/ServiceBase.js';
import { Base } from './Base.js';
import { eventLog } from '../infrastructure.js';

const orderCreateValidation = {
  customerId: ['required', 'string'],
  items: ['required', { list_of_objects: { item_id: ['required', 'string'], quantity: ['required', 'positive_integer'] } }]
} as const;

type OrderCreateInput = InferFromSchema<typeof orderCreateValidation>;

interface OrderCreateOutput {
  orderId: string;
  total: number;
}

export class OrdersCreate extends Base<OrderCreateInput, OrderCreateOutput> {
  static validation = orderCreateValidation;

  async checkPermissions(): Promise<boolean> {
    return true;
  }

  async execute(data: OrderCreateInput): Promise<OrderCreateOutput> {
    // Simulate order creation
    const orderId = `order-${Date.now()}`;
    const total = data.items.reduce((sum, item) => sum + item.quantity * 10, 0);

    return { orderId, total };
  }

  // Publish events after successful order creation
  protected override async afterSuccess(
    result: OrderCreateOutput,
    context: RunContext<OrderCreateInput>
  ): Promise<void> {
    eventLog.push({
      event: 'order.created',
      data: {
        orderId: result.orderId,
        customerId: context.cleanData?.customerId,
        total: result.total
      }
    });
    console.log(`[${this.constructor.name}] Published order.created event`);
  }
}
