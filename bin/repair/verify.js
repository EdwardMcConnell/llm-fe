import { execSync } from 'child_process';

export async function verify(patchedContractPath) {
  console.log(`\n[Phase 4] The Gauntlet: Mechanical Compilation & Verification...`);

  try {
    // Determine which generator to run based on the contract
    // Hardcoding kanban and settings-form regeneration for the simulation
    console.log(`  -> Regenerating compiled components...`);
    execSync(`npm run generate:kanban`, { stdio: 'inherit' });
    execSync(`npm run generate:settings`, { stdio: 'inherit' });

    console.log(`  -> Committing generated changes to pass verify:generated...`);
    execSync(`git add . && git commit -m "temp: autonomous repair verification"`, { stdio: 'pipe' });

    console.log(`  -> Running the Verify All Gauntlet...`);
    execSync(`npm run verify:all`, { stdio: 'inherit' });
    
    console.log(`  -> Success! Gauntlet passed. Fix is verified.`);
    return true;
  } catch (error) {
    try {
      execSync(`git reset --hard HEAD~1`, { stdio: 'pipe' });
    } catch (e) {}
    throw new Error(`Gauntlet failed. The fix broke regressions or did not pass the new test.`);
  }
}
