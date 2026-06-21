import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { askLLM } from '../llm-client.js';

export async function reproduce(bugId, localization, fixture) {
  console.log(`\n[Phase 2] Reproduction: Forcing LLM to generate failing regression test...`);
  
  // Call the LLM to generate the test
  const generatedTest = await askLLM('reproduce', { bugId, localization, fixture });

  const testPath = generatedTest.filename;
  fs.mkdirSync(path.dirname(testPath), { recursive: true });
  fs.writeFileSync(testPath, generatedTest.content, 'utf8');

  console.log(`  -> Generated test written to ${testPath}`);

  // Mechanical Verification: The test MUST fail.
  try {
    console.log(`  -> Executing regression test (expecting failure)...`);
    // Run vitest on the specific file, ignore exit code 1 as expected
    execSync(`npx vitest run ${testPath}`, { stdio: 'pipe' });
    
    // If we reach here, it passed! That's bad.
    throw new Error(`Regression test PASSED unexpectedly. LLM failed to reproduce the bug.`);
  } catch (error) {
    if (error.message.includes('Regression test PASSED')) {
      throw error;
    }
    // Expected failure.
    console.log(`  -> Success! Regression test failed exactly as expected.`);
  }

  return testPath;
}
