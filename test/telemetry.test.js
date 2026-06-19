import { describe, it, expect, vi } from 'vitest';
import { TelemetryManager } from '../src/telemetry.js';

describe('Fe TelemetryManager (Phase 9)', () => {
  it('should batch tracking events autonomously', () => {
    const telemetry = new TelemetryManager();
    
    telemetry.track('TEST_EVENT', { data: 123 });
    
    expect(telemetry.batch.length).toBe(1);
    expect(telemetry.batch[0].type).toBe('TEST_EVENT');
    expect(telemetry.batch[0].data).toBe(123);
    // Should stamp with high-res timestamp natively
    expect(typeof telemetry.batch[0].timestamp).toBe('number');
  });

  it('should flush batches to the window event bus', () => {
    const telemetry = new TelemetryManager();
    
    // Mock window to capture dispatchEvent
    global.window = {
      dispatchEvent: vi.fn()
    };
    
    telemetry.track('ACTION_1');
    telemetry.track('ACTION_2');
    
    expect(telemetry.batch.length).toBe(2);
    
    telemetry.flush();
    
    expect(telemetry.batch.length).toBe(0);
    expect(global.window.dispatchEvent).toHaveBeenCalledTimes(1);
    
    const eventArg = global.window.dispatchEvent.mock.calls[0][0];
    expect(eventArg.detail.type).toBe('telemetry');
    expect(eventArg.detail.events.length).toBe(2);
    
    delete global.window; // Cleanup
  });
});
