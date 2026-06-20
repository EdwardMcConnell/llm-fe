import { bench, describe } from 'vitest';
import '../benchmarks/table-framework.js';
import '../benchmarks/table-direct.js';

// Helper to flush queueMicrotask (simulate event loop tick)
function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Data generator
function generateData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i,
      status: i % 2 === 0 ? 'active' : 'inactive',
      total: Math.floor(Math.random() * 100)
    });
  }
  return data;
}

// Mutate 10% of rows
function mutateData(data) {
  const newData = [...data];
  // Change every 10th row
  for (let i = 0; i < data.length; i += 10) {
    newData[i] = {
      ...newData[i],
      status: newData[i].status === 'active' ? 'pending' : 'active',
      total: newData[i].total + 1
    };
  }
  return newData;
}

describe('1,000-Row Table (10% High-Churn Updates)', () => {
  // Pre-generate data
  const baseData = generateData(1000);
  const mutatedData = mutateData(baseData);
  
  // Create instances
  const fwTable = document.createElement('fe-table-framework');
  document.body.appendChild(fwTable);
  
  const directTable = document.createElement('fe-table-direct');
  document.body.appendChild(directTable);

  bench('Fe Framework (Generic diffing via morphNode)', async () => {
    // Alternate between base and mutated
    fwTable.data = baseData;
    await flushMicrotasks();
    fwTable.data = mutatedData;
    await flushMicrotasks();
  }, { setup: async () => { fwTable.data = baseData; await flushMicrotasks(); } });

  bench('Fe Direct (Imperative Direct DOM Patch)', async () => {
    directTable.data = baseData;
    await flushMicrotasks();
    directTable.data = mutatedData;
    await flushMicrotasks();
  }, { setup: async () => { directTable.data = baseData; await flushMicrotasks(); } });
});
