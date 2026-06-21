import fs from 'fs';

export async function commit(bugId, fixturePath, testPath, patchedContractPath) {
  console.log(`\n[Phase 5] Commit: Recording successful autonomous repair...`);

  const ledgerPath = 'bug-history/bugs.json';
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const entry = ledger.find(b => b.bugId === bugId);
  if (!entry) {
    throw new Error(`Bug ${bugId} not found in ledger.`);
  }

  // Update ledger with passed states
  entry.sanitizedFixturePath = fixturePath;
  entry.generatedFailingTestPath = testPath;
  entry.verifyAllResult = "pass";
  entry.securityProofResult = "pass";
  
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');

  console.log(`  -> Ledger updated. Autonomous repair cycle complete for ${bugId}.`);
  return true;
}
