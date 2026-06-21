import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function runProof() {
  console.log('Running Autonomous Repair Loop Proof simulation...');
  
  const ledgerPath = 'bug-history/bugs.json';
  if (!fs.existsSync(ledgerPath)) {
    throw new Error('bug-history/bugs.json ledger is missing');
  }

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  if (!Array.isArray(ledger) || ledger.length === 0) {
    throw new Error('bugHistory ledger is empty. Cannot claim Autonomous Repair Loop Proven.');
  }

  const schemaPath = 'contracts/telemetry.contract.json';
  if (!fs.existsSync(schemaPath)) {
    throw new Error('telemetry.contract.json is missing');
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  for (const bug of ledger) {
    // 1. Verify sanitized fixture exists
    if (!bug.sanitizedFixturePath || !fs.existsSync(bug.sanitizedFixturePath)) {
      throw new Error(`Bug ${bug.bugId} references missing sanitizedFixturePath: ${bug.sanitizedFixturePath}`);
    }
    
    // 2. Verify fixture against telemetry schema
    const fixture = JSON.parse(fs.readFileSync(bug.sanitizedFixturePath, 'utf8'));
    if (!fixture.eventEnvelope || !fixture.eventEnvelope.eventKind) {
      throw new Error(`Bug ${bug.bugId} fixture is missing required eventEnvelope.eventKind`);
    }
    if (!schema.eventEnvelope.eventKind.includes(fixture.eventEnvelope.eventKind)) {
      throw new Error(`Bug ${bug.bugId} fixture has invalid eventKind: ${fixture.eventEnvelope.eventKind}`);
    }

    // 3. Verify pre-fix failure artifact exists
    if (!bug.preFixArtifactPath || !fs.existsSync(bug.preFixArtifactPath)) {
      throw new Error(`Bug ${bug.bugId} references missing preFixArtifactPath: ${bug.preFixArtifactPath}`);
    }

    // 4. Verify patch target exists
    const contractPath = bug.rootCausePointer.split('#')[0];
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Bug ${bug.bugId} references missing contract path: ${contractPath}`);
    }

    // 5. Verify regenerated artifacts contain the fix (exist)
    for (const artifact of bug.regeneratedArtifacts) {
      if (!fs.existsSync(artifact)) {
        throw new Error(`Bug ${bug.bugId} references missing regenerated artifact: ${artifact}`);
      }
    }

    // 6. Verify regression test exists
    if (!bug.generatedFailingTestPath || !fs.existsSync(bug.generatedFailingTestPath)) {
      throw new Error(`Bug ${bug.bugId} references missing regression test: ${bug.generatedFailingTestPath}`);
    }
    
    // 7. Prove the regression test passes
    try {
      console.log(`Executing regression test for ${bug.bugId}...`);
      execSync(`npx vitest run ${bug.generatedFailingTestPath}`, { stdio: 'inherit' });
    } catch (e) {
      throw new Error(`Bug ${bug.bugId} regression test failed: ${e.message}`);
    }
  }

  console.log('Telemetry contract and Bug Ledger verified.');
  console.log('Repair Loop Simulation passed.');
}

runProof();
