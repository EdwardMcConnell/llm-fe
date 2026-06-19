import { createSignal } from './reactivity.js';

/**
 * @typedef {Object} FormState
 * @property {Record<string, any>} values
 * @property {Record<string, string>} errors
 * @property {boolean} isDirty
 * @property {boolean} isSubmitting
 * @property {boolean} isValid
 */

/**
 * Creates a specialized reactive signal for managing form state seamlessly.
 * 
 * @param {Record<string, any>} initialValues 
 * @param {(values: Record<string, any>) => Record<string, string>} validateFn 
 * @returns {[() => FormState, {
 *   setFieldValue: (field: string, value: any) => void,
 *   setIsSubmitting: (isSubmitting: boolean) => void,
 *   submit: (onSubmit: (values: Record<string, any>) => Promise<void>) => Promise<void>
 * }]}
 */
export function createFormSignal(initialValues = {}, validateFn = () => ({})) {
  const initialErrors = validateFn(initialValues);
  
  const [getState, setState] = createSignal({
    values: { ...initialValues },
    errors: initialErrors,
    isDirty: false,
    isSubmitting: false,
    isValid: Object.keys(initialErrors).length === 0
  });

  const actions = {
    setFieldValue: (field, value) => {
      const state = getState();
      const newValues = { ...state.values, [field]: value };
      const newErrors = validateFn(newValues);
      
      setState({
        ...state,
        values: newValues,
        errors: newErrors,
        isDirty: true,
        isValid: Object.keys(newErrors).length === 0
      });
    },

    setFieldTouched: (field, isTouched) => {
      const state = getState();
      setState({ ...state, isDirty: isTouched });
      // In a more robust system, we would track touched state per-field
    },

    resetForm: () => {
      setState({
        values: { ...initialValues },
        errors: initialErrors,
        isDirty: false,
        isSubmitting: false,
        isValid: Object.keys(initialErrors).length === 0
      });
    },

    setIsSubmitting: (isSubmitting) => {
      const state = getState();
      setState({ ...state, isSubmitting });
    },

    submit: async (onSubmit) => {
      const state = getState();
      
      // (Native form submission automatically surfaces native validation popups)
      
      if (!getState().isValid) return;

      actions.setIsSubmitting(true);
      try {
        await onSubmit(getState().values);
      } finally {
        actions.setIsSubmitting(false);
      }
    }
  };

  return [getState, actions];
}

/**
 * Native-First Form Accessibility Synchronizer.
 * Synchronizes the visual CSS `:user-invalid` state with the `aria-invalid` attribute
 * so screen readers don't announce errors before the user has interacted.
 */
const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const updateState = (input) => {
    const isValid = input.checkValidity();

    // Update both visual and ARIA state
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);

    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };

  const handleEvent = (event) => {
    const input = event.target;

    if (event.type === 'reset' && input.matches?.('form')) {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback');
        control.classList.remove('user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }

    if (!input.matches?.('input, textarea, select')) return;

    if (event.type === 'input' || event.type === 'change') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) {
        updateState(input);
      }
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) {
        updateState(input);
      }
    }
  };

  const init = () => {
    // If the browser natively supports :user-invalid, we still need to sync aria-invalid.
    // The modern-web-guidance provides this fallback specifically for browsers missing the CSS selector.
    // However, even IF the CSS selector exists, aria-invalid doesn't magically appear natively.
    // Wait, if CSS.supports(':user-invalid'), we only need to map :user-invalid to aria-invalid.
    // If it doesn't support it, we need to apply the classes.
    // Let's just use the manual dirtyState logic for everything to guarantee aria-invalid injection consistently.
    
    document.addEventListener('blur', handleEvent, true);
    document.addEventListener('input', handleEvent, true);
    document.addEventListener('change', handleEvent, true);
    document.addEventListener('reset', handleEvent, true);
  };

  return { init };
})();

// Initialize globally on module load
if (typeof document !== 'undefined') {
  UserInvalidFallback.init();
}
