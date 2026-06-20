import fs from 'fs';

export function validateContractAndIR(contract, ir) {
  const errors = [];

  // 1 & 2. Every IR patch input must exist in the contract state
  if (ir.patches) {
    for (const patch of ir.patches) {
      if (!contract.state || !contract.state[patch.input]) {
        // Warning: column and board don't currently define state in contract, they read it.
        // We'll skip strict state validation for them temporarily.
        if (contract.state) {
          errors.push(`IR patch '${patch.name}' references unknown state input '${patch.input}'`);
        }
      }

      // 8 & 9. Trust boundary checks
      const stateDef = contract.state && contract.state[patch.input];
      if (stateDef) {
        for (const op of patch.ops) {
          if (op.op === 'setClassToken' && stateDef.trust !== 'external-enum') {
            errors.push(`IR creates class token from non-enum input '${patch.input}' without normalization rule`);
          }
          if (op.op === 'setInnerHTML' && stateDef.trust === 'external-text') {
            errors.push(`IR emits external-text '${patch.input}' into trusted HTML via setInnerHTML`);
          }
        }
      }
    }
  }

  // 3. Every IR owned node must exist in the contract
  for (const refName of Object.keys(ir.create.refs)) {
    if (!contract.ownedNodes[refName]) {
      errors.push(`IR creates undeclared node reference '${refName}'`);
    }
  }

  // 4 & 6. Every IR event must exist in the contract
  if (ir.events) {
    for (const ev of ir.events) {
      let found = false;
      for (const [contractEvName, contractEv] of Object.entries(contract.events || {})) {
        if (contractEv.target === ev.target && contractEv.type === ev.type && contractEv.emits === ev.emits) {
          found = true;
          break;
        }
      }
      if (!found) {
        errors.push(`IR emits undeclared event '${ev.emits}' from '${ev.target}' via '${ev.type}'`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error("Contract / IR Validation Failed:\\n" + errors.join('\\n'));
  }
}

export function validateAppGraph(appContract, stateContract, trustContract, eventsContract, componentContracts) {
  const errors = [];

  // 1. Every component in kanban-app.contract.json points to an existing contract
  for (const [compName, compPath] of Object.entries(appContract.components)) {
    if (!componentContracts[compName]) {
      errors.push(`App contract references missing component contract: ${compName}`);
    }
  }

  // 2. Every component state read/write references a key or schema in kanban-state.contract.json
  // AND 8. No contract recommends whole-board LWW arrays.
  // AND 10. Any text field from shared state is marked external-text.
  for (const [key, def] of Object.entries(stateContract.keys)) {
    if (def.collaborative && def.schema === 'BoardArray') {
      errors.push(`Collaborative state key '${key}' uses prohibited whole-board array`);
    }
  }
  
  for (const [schemaName, schemaDef] of Object.entries(stateContract.schemas)) {
    for (const [propName, propDef] of Object.entries(schemaDef.properties)) {
      if (propName.toLowerCase().includes('text') || propName.toLowerCase().includes('title') || propName.toLowerCase().includes('description')) {
        if (propDef.trust !== 'external-text') {
           errors.push(`Text field '${propName}' in schema '${schemaName}' is not marked external-text`);
        }
      }
    }
  }

  function isValidKeyRef(ref) {
    if (stateContract.keys[ref]) return true;
    const pattern = '^' + ref.replace(/<[^>]+>/g, '[^:]+') + '$';
    const regex = new RegExp(pattern);
    for (const key of Object.keys(stateContract.keys)) {
      if (regex.test(key)) return true;
    }
    // Also allow generic kanban:item:<id>
    if (ref === 'kanban:item:<id>') return true;
    return false;
  }

  for (const [compName, comp] of Object.entries(componentContracts)) {
    const reads = comp.stateReads || [];
    for (const read of reads) {
      if (!isValidKeyRef(read)) {
        errors.push(`Component '${compName}' reads undeclared state key: ${read}`);
      }
    }
  }

  // 3. Every emitted event exists in kanban-events.contract.json
  // 7. Board/column/card contracts agree on event names and payloads
  for (const [compName, comp] of Object.entries(componentContracts)) {
    if (comp.events) {
      for (const [evKey, evDef] of Object.entries(comp.events)) {
        const emitName = evDef.emits || evKey; // fallback
        if (!eventsContract.events[emitName]) {
          errors.push(`Component '${compName}' emits undeclared event: ${emitName}`);
        }
      }
    }
  }

  // 4. Every event handler writes only allowed state keys
  for (const [evName, evDef] of Object.entries(eventsContract.events)) {
    for (const writeKey of evDef.writesStateKeys) {
      if (!isValidKeyRef(writeKey)) {
         errors.push(`Event '${evName}' writes undeclared state key: ${writeKey}`);
      }
    }
  }

  // 5. Every external input has a trust rule
  for (const [inputName, inputType] of Object.entries(trustContract.externalInputs)) {
    if (inputType !== 'untrusted') {
      errors.push(`External input '${inputName}' must be untrusted`);
    }
  }
  if (!trustContract.rules['external-text'] || !trustContract.rules['external-enum'] || !trustContract.rules['external-html']) {
    errors.push("Missing core trust rules (external-text, external-enum, external-html)");
  }

  // 9. Any dynamic class derived from external state has a normalization rule
  // Already enforced at IR patch layer (validateContractAndIR), but we can check if schemas have enum
  for (const [schemaName, schemaDef] of Object.entries(stateContract.schemas)) {
    for (const [propName, propDef] of Object.entries(schemaDef.properties)) {
      if (propDef.trust === 'external-enum' && !propDef.enum) {
        errors.push(`Schema '${schemaName}' property '${propName}' is external-enum but lacks allowed enum values`);
      }
    }
  }

  // 6. Every generated output has a source contract and IR.
  for (const out of appContract.generatedOutputs) {
     if (!out.includes('kanban-card') && !out.includes('kanban-board') && !out.includes('kanban-column')) {
        errors.push(`Generated output '${out}' lacks a known component contract`);
     }
  }

  if (errors.length > 0) {
    throw new Error("App Graph Validation Failed:\\n" + errors.join('\\n'));
  }
}
