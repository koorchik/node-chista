/**
 * Simulated infrastructure for hooks example.
 *
 * In a real application, these would be actual services (e.g., Prometheus, Sentry, Kafka).
 */

// Metrics collector
export const metrics = {
  calls: [] as Array<{ service: string; durationMs: number; success: boolean }>,
  report() {
    console.log('\n=== Metrics Report ===');
    for (const m of this.calls) {
      console.log(`  ${m.service}: ${m.durationMs}ms (${m.success ? 'OK' : 'FAILED'})`);
    }
  }
};

// Event log (simulates message queue)
export const eventLog: Array<{ event: string; data: unknown }> = [];

// Error tracker (simulates error monitoring service)
export const errorTracker = {
  errors: [] as Array<{ service: string; error: unknown; input: unknown }>,
  report() {
    console.log('\n=== Error Report ===');
    for (const e of this.errors) {
      console.log(`  ${e.service}:`, e.error instanceof Error ? e.error.message : e.error);
    }
  }
};
