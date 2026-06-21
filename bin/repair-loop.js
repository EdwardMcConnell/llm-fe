#!/usr/env/bin node

import fs from 'fs';
import path from 'path';
import { triage } from './repair/triage.js';
import { reproduce } from './repair/reproduce.js';
import { patch } from './repair/patch.js';
import { verify } from './repair/verify.js';
import { commit } from './repair/commit.js';

async function runLoop() {
  console.log("==================================================");
  console.log("     Fe Autonomous Repair Orchestrator            ");
  console.log("==================================================");

  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error("Usage: npm run repair <path/to/fixture.json>");
    process.exit(1);
  }

  // Derive bug ID from fixture name for the simulation
  const bugId = path.basename(fixturePath, '.json');

  try {
    // 1. Triage
    const localization = await triage(fixturePath);

    // 2. Reproduce (TDD)
    // Read the fixture payload for the LLM
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const testPath = await reproduce(bugId, localization, fixture);

    // 3. Patch Contract
    const patchedContractPath = await patch(bugId, localization, testPath);

    // 4. Verify (The Gauntlet)
    await verify(patchedContractPath);

    // 5. Commit
    await commit(bugId, fixturePath, testPath, patchedContractPath);

    console.log("\n✅ Autonomous Repair Loop completed successfully!");
  } catch (err) {
    console.error(`\n❌ Autonomous Repair Loop Failed: ${err.message}`);
    process.exit(1);
  }
}

runLoop();
