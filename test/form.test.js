import { describe, it, expect } from 'vitest';
import { createFormSignal } from '../src/form.js';

describe('Fe Form Engine (Phase 7)', () => {
  it('should initialize with values and run initial validation', () => {
    const validate = (values) => {
      const errors = {};
      if (!values.email) errors.email = 'Required';
      return errors;
    };

    const [getState] = createFormSignal({ email: '' }, validate);
    const state = getState();

    expect(state.values.email).toBe('');
    expect(state.errors.email).toBe('Required');
    expect(state.isDirty).toBe(false);
    expect(state.isValid).toBe(false);
  });

  it('should update values, run validation, and set isDirty on setFieldValue', () => {
    const validate = (values) => {
      if (values.age < 18) return { age: 'Too young' };
      return {};
    };

    const [getState, actions] = createFormSignal({ age: 10 }, validate);
    
    actions.setFieldValue('age', 20);
    const state = getState();

    expect(state.values.age).toBe(20);
    expect(state.errors.age).toBeUndefined();
    expect(state.isDirty).toBe(true);
    expect(state.isValid).toBe(true);
  });

  it('should prevent submission if invalid', async () => {
    let submitted = false;
    const [getState, actions] = createFormSignal({ name: '' }, (vals) => {
      const errs = {};
      if (!vals.name) errs.name = 'Required';
      return errs;
    });

    await actions.submit(async () => { submitted = true; });

    // Should block submission natively
    expect(submitted).toBe(false);
  });
});
