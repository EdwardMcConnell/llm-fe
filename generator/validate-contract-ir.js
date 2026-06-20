import fs from 'fs';

export function validateContractAndIR(contract, ir) {
  const errors = [];

  // 1 & 2. Every IR patch input must exist in the contract state
  for (const patch of ir.patches) {
    if (!contract.state[patch.input]) {
      errors.push(`IR patch '${patch.name}' references unknown state input '${patch.input}'`);
    }

    // 8 & 9. Trust boundary checks
    const stateDef = contract.state[patch.input];
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

  // 3. Every IR owned node must exist in the contract
  for (const refName of Object.keys(ir.create.refs)) {
    if (!contract.ownedNodes[refName]) {
      errors.push(`IR creates undeclared node reference '${refName}'`);
    }
  }

  // 4 & 6. Every IR event must exist in the contract
  for (const ev of ir.events) {
    let found = false;
    for (const [contractEvName, contractEv] of Object.entries(contract.events)) {
      if (contractEv.target === ev.target && contractEv.type === ev.type && contractEv.emits === ev.emits) {
        found = true;
        break;
      }
    }
    if (!found) {
      errors.push(`IR emits undeclared event '${ev.emits}' from '${ev.target}' via '${ev.type}'`);
    }
  }

  if (errors.length > 0) {
    throw new Error("Contract / IR Validation Failed:\\n" + errors.join('\\n'));
  }
}
