import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const APPS = [
  { name: 'normalized-kanban', path: 'gauntlet/apps/normalized-kanban' },
  { name: 'live-dashboard', path: 'test/live-dashboard.generated.test.js' },
  { name: 'settings-form', path: 'test/settings-form.generated.test.js' },
  { name: 'data-grid', path: 'test/data-grid.generated.test.js' },
  { name: 'product-catalog', path: 'test/product-catalog.generated.test.js' }
];

const requirementsRaw = fs.readFileSync('gauntlet/proof-requirements.json', 'utf8');
const requirements = JSON.parse(requirementsRaw);

function runVitest(cmd) {
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch(e) {}
    }
    return null;
  }
}

async function processApp(app) {
  console.log(`\nRunning gauntlet for ${app.name}...`);
  const reqs = requirements[app.name];

  const result = {
    app: app.name,
    tests: { status: "missing", source: "Unit/Cleanup Tests", proof: "missing", notes: [] },
    cleanup: { status: "missing", source: "Cleanup Proof", proof: "missing", notes: [] },
    safeRendering: { status: "missing", source: "Safe Rendering Proof", proof: "missing", notes: [] },
    benchmarks: { status: "missing", source: "Benchmarks", proof: "missing", results: {}, notes: [] },
    contracts: { status: "missing", source: "Contracts", proof: "missing", notes: [] },
    generatedArtifacts: { status: "missing", source: "Generated Output", proof: "missing", notes: [] }
  };

  // 1. Run Unit/Cleanup Tests via Vitest JSON Reporter
  console.log(`  - Running unit/cleanup tests...`);
  const genPath = `generated-examples/${app.name}`;
  const testPaths = fs.existsSync(genPath) ? `${app.path} ${genPath}` : app.path;
  const testCmd = `npx vitest run ${testPaths} --reporter json --passWithNoTests`;
  const testRes = runVitest(testCmd);

  let executedTests = [];
  let testPasses = true;

  if (testRes && testRes.testResults) {
    for (const fileResult of testRes.testResults) {
      for (const assertion of fileResult.assertionResults) {
        executedTests.push(assertion.title);
        if (assertion.status !== 'passed') {
          testPasses = false;
        }
      }
    }
  } else {
    testPasses = false;
  }

  // Validate against proof-requirements
  if (reqs.tests && reqs.tests.length > 0) {
    let missingTests = [];
    for (const requiredTest of reqs.tests) {
      if (!executedTests.includes(requiredTest)) {
        missingTests.push(requiredTest);
      }
    }

    if (missingTests.length > 0) {
      result.tests.status = "fail";
      result.tests.notes.push(`Missing required tests: ${missingTests.join(', ')}`);
      result.cleanup.status = missingTests.some(t => t.includes('clean') || t.includes('disconnect')) ? "fail" : "pass";
    } else if (testPasses) {
      result.tests.status = "pass";
      result.tests.proof = `${executedTests.length} tests passed`;
      result.cleanup.status = "pass";
      result.cleanup.proof = "Cleanup requirements satisfied";
      result.safeRendering.status = "pass";
      result.safeRendering.proof = "Safe rendering constraints verified";
    } else {
      result.tests.status = "fail";
      result.tests.notes.push("Test suite failed execution.");
      result.cleanup.status = "fail";
      result.safeRendering.status = "fail";
    }
  } else {
    result.tests.status = "skipped";
    result.cleanup.status = "skipped";
    result.safeRendering.status = "skipped";
  }

  // 2. Run Benchmarks via Vitest JSON Reporter
  console.log(`  - Running benchmarks...`);
  if (reqs.benchmarks && reqs.benchmarks.length > 0) {
    // We parse the vitest bench output manually because the JSON reporter for bench is sometimes experimental
    try {
      const benchPaths = `${app.path}/*.bench.js bench/${app.name}*.bench.js`;
      const benchCmd = `npx vitest bench ${benchPaths} --passWithNoTests`;
      const stdoutRaw = execSync(benchCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const stdout = stdoutRaw.replace(/\x1B\[\d+;?\d*m/g, ''); // Strip ANSI colors
      
      let executedBenchmarks = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.includes('·')) continue;
        const match = line.match(/·\s+(.*?)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
        if (match) {
          const name = match[1].trim();
          const ms = parseFloat(match[5].replace(/,/g, '')); // Mean time
          executedBenchmarks.push(name);
          result.benchmarks.results[name] = ms;
        }
      }

      let missingBenches = [];
      for (const reqBench of reqs.benchmarks) {
        if (!executedBenchmarks.some(b => b.includes(reqBench))) {
          missingBenches.push(reqBench);
          result.benchmarks.results[reqBench] = "missing";
        }
      }

      if (missingBenches.length > 0) {
        result.benchmarks.status = "fail";
        result.benchmarks.notes.push(`Missing required benchmarks: ${missingBenches.join(', ')}`);
      } else {
        result.benchmarks.status = "pass";
        result.benchmarks.proof = "All required benchmarks executed successfully";
      }

    } catch (err) {
      result.benchmarks.status = "fail";
      result.benchmarks.notes.push("Benchmark suite failed or crashed.");
    }
  } else {
    result.benchmarks.status = "skipped";
  }

  // 3. Contracts
  if (reqs.contracts && reqs.contracts.length > 0) {
    let missingContracts = [];
    for (const contract of reqs.contracts) {
      if (!fs.existsSync(path.join('contracts', contract))) {
        missingContracts.push(contract);
      }
    }
    if (missingContracts.length > 0) {
      result.contracts.status = "fail";
      result.contracts.notes.push(`Missing contracts: ${missingContracts.join(', ')}`);
    } else {
      result.contracts.status = "pass";
      result.contracts.proof = reqs.contracts.join(', ');
    }
  } else {
    result.contracts.status = "skipped";
  }

  // 4. Generated Artifacts
  if (reqs.generatedArtifacts && reqs.generatedArtifacts.length > 0) {
    let missingArtifacts = [];
    // Assuming artifacts are placed logically based on the app or in generated-examples
    for (const artifact of reqs.generatedArtifacts) {
      const artifactDirName = artifact.replace('.generated.js', '').replace('.generated.test.js', '');
      const path1 = path.join('generated-examples', artifactDirName, artifact);
      const path2 = path.join('generated-examples', app.name, artifact);
      
      if (!fs.existsSync(path1) && !fs.existsSync(path2)) {
        missingArtifacts.push(artifact);
      }
    }
    if (missingArtifacts.length > 0) {
      result.generatedArtifacts.status = "fail";
      result.generatedArtifacts.notes.push(`Missing artifacts: ${missingArtifacts.join(', ')}`);
    } else {
      result.generatedArtifacts.status = "pass";
      result.generatedArtifacts.proof = reqs.generatedArtifacts.join(', ');
    }
  } else {
    result.generatedArtifacts.status = "skipped";
  }

  return result;
}

async function runGauntlet() {
  const results = [];
  let allPass = true;
  let weakestArea = null;
  let nextRecommendedTask = null;

  for (const app of APPS) {
    const res = await processApp(app);
    results.push(res);

    for (const [key, category] of Object.entries(res)) {
      if (typeof category === 'object' && category.status === 'fail' || category.status === 'missing') {
        allPass = false;
        if (!weakestArea) {
          weakestArea = `${key} failing for ${app.name}`;
          nextRecommendedTask = category.notes.length > 0 ? category.notes[0] : `Implement missing ${key} proofs.`;
        }
      }
    }
  }

  const finalReport = {
    results,
    summary: {
      canClaimReady: allPass,
      weakestArea: weakestArea || 'None',
      nextRecommendedTask: nextRecommendedTask || 'None. Gauntlet is fully passing.'
    }
  };

  fs.mkdirSync('gauntlet/results', { recursive: true });
  fs.writeFileSync('gauntlet/results/latest.json', JSON.stringify(finalReport, null, 2));
  
  // Calculate maturity
  execSync('node maturity/update-status.js', { stdio: 'inherit' });
  const maturityStr = fs.readFileSync('maturity/status.json', 'utf8');
  const maturity = JSON.parse(maturityStr);
  
  console.log(`\n==================================`);
  console.log(`Gauntlet Complete. Scorecard written to gauntlet/results/latest.json`);
  console.log(`==================================\n`);
  
  console.log(`Maturity Level: ${maturity.currentLevel} - ${maturity.currentLevelName}`);
  console.log(`Next Level: ${maturity.nextLevel} - ${maturity.nextLevelName}`);
  console.log(`\nCan Claim:\n  * ${maturity.canClaim.join('\n  * ')}`);
  console.log(`\nCannot Claim:\n  * ${maturity.cannotClaim.join('\n  * ')}`);
  
  if (maturity.missingForNextLevel.length > 0) {
    console.log(`\nMissing for Next Level:\n  - ${maturity.missingForNextLevel.join('\n  - ')}\n`);
  }
  
  if (!allPass) {
    console.log(`Weakest area:\n${weakestArea}\n`);
    console.log(`Next recommended task:\n${nextRecommendedTask}\n`);
    process.exit(1);
  } else {
    console.log(`All required proofs pass. The repository can claim readiness.`);
  }
}

runGauntlet();
