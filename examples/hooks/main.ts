/**
 * Lifecycle Hooks Example
 *
 * Demonstrates onSuccess and onError hooks for:
 * - Logging and metrics collection
 * - Event publishing after successful operations
 * - Error tracking and cleanup on failure
 *
 * Run with: npx ts-node --esm examples/hooks/main.ts
 */

import { metrics, errorTracker, eventLog } from './infrastructure.js';
import { OrdersCreate } from './services/OrdersCreate.js';
import { PaymentsProcess } from './services/PaymentsProcess.js';

async function main() {
  const orderService = new OrdersCreate();
  const paymentService = new PaymentsProcess();

  // Successful order
  console.log('\n--- Creating order ---');
  try {
    const order = await orderService.run({
      customerId: 'cust-123',
      items: [
        { item_id: 'item-1', quantity: 2 },
        { item_id: 'item-2', quantity: 1 }
      ]
    });
    console.log('Order created:', order);
  } catch (error) {
    // handled by hook
  }

  // Successful payment
  console.log('\n--- Processing payment ---');
  try {
    const payment = await paymentService.run({
      orderId: 'order-123',
      amount: 99.99,
      cardToken: 'valid-token'
    });
    console.log('Payment processed:', payment);
  } catch (error) {
    // handled by hook
  }

  // Failed payment (triggers cleanup)
  console.log('\n--- Processing failed payment ---');
  try {
    await new PaymentsProcess().run({
      orderId: 'order-456',
      amount: 49.99,
      cardToken: 'invalid-token'
    });
  } catch (error) {
    // Error already logged by hook
  }

  // Validation error
  console.log('\n--- Validation error ---');
  try {
    await orderService.run({
      customerId: '', // Invalid
      items: []       // Invalid
    });
  } catch (error) {
    // Validation error logged by hook
  }

  // Print collected metrics and events
  metrics.report();
  errorTracker.report();

  console.log('\n=== Event Log ===');
  for (const e of eventLog) {
    console.log(`  ${e.event}:`, e.data);
  }
}

main();
