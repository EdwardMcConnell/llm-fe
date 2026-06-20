import { bench, describe } from 'vitest';
import { createOrderCard } from '../sample/components/order-card.generated.js';

// Setup event sink
const noopSink = () => {};

describe('Track B: Generated Direct DOM vs Framework', () => {
  const initialState = {
    orderTitle: 'Latte',
    orderStatus: 'pending',
    orderTotal: 4.50
  };

  const nextState = {
    orderTitle: 'Latte (Large)',
    orderStatus: 'completed',
    orderTotal: 5.50
  };

  bench('Generated Direct DOM Patching', () => {
    const component = createOrderCard(initialState, noopSink);
    // Simulate mounting
    document.body.appendChild(component.root);
    
    // Patch fields
    component.patch(nextState);
    
    // Cleanup
    component.dispose();
    document.body.removeChild(component.root);
  });
});
