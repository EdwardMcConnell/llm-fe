import fs from 'fs';
import { askLLM } from '../llm-client.js';

export async function triage(fixturePath) {
  console.log(`\n[Phase 1] Triage: Ingesting telemetry from ${fixturePath}...`);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  
  // Call the LLM to localize the failure
  const localization = await askLLM('triage', { fixture });

  console.log(`  -> Localized Root Cause Contract: ${localization.rootCausePointer}`);
  console.log(`  -> Localized Root Cause IR Node: ${localization.rootCauseIrNode}`);

  return localization;
}
