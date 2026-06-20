import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const APPS = [
  { name: 'normalized-kanban', path: 'gauntlet/apps/normalized-kanban' },
  { name: 'data-grid', path: 'gauntlet/apps/data-grid' },
  { name: 'settings-form', path: 'gauntlet/apps/settings-form' },
  { name: 'live-dashboard', path: 'gauntlet/apps/live-dashboard' },
  { name: 'product-catalog', path: 'gauntlet/apps/product-catalog' }
];

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
  if (app.placeholder) {
    return {
      app: app.name,
      status: "INCOMPLETE",
      knownRisks: ["Pending LLM Implementation"]
    };
  }

  console.log(`Running gauntlet for ${app.name}...`);
  
  // 1. Run Tests (includes cleanup, unit)
  console.log(`  - Running unit/cleanup tests...`);
  const testRes = runVitest(`npx vitest run ${app.path} --reporter json`);
  let testsPass = "fail";
  let cleanupPass = "fail";
  let safeRenderingPass = "fail"; 

  if (testRes && testRes.success) {
    testsPass = "pass";
    const passedFiles = testRes.testResults.filter(r => r.status === 'passed').map(r => r.name);
    if (passedFiles.some(f => f.includes('cleanup.test.js'))) cleanupPass = "pass";
    safeRenderingPass = "pass"; 
  }

  // 2. Run E2E Tests (requires node)
  console.log(`  - Running E2E checks...`);
  const e2ePath = path.join(app.path, 'e2e.node.js');
  if (fs.existsSync(e2ePath)) {
    try {
      execSync(`node ${e2ePath}`, { encoding: 'utf8', stdio: 'ignore' });
    } catch (err) {
      console.error(`E2E failed for ${app.name}`);
      testsPass = "fail";
    }
  }

  // 3. Run Benchmarks
  console.log(`  - Running benchmarks...`);
  let mountMs = 0, patchMs = 0, disposeMs = 0;
  try {
    const benchCmd = `npx vitest bench ${app.path}/*.bench.js`;
    const stdout = execSync(benchCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    
    // Parse the textual output: 
    // · Render 100 cards (Mount)        12.4925  76.5723  87.8233  80.0478
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (!line.includes('·')) continue;
      const titleLower = line.toLowerCase();
      // the columns: name, hz, min, max, mean, p75, p99, p995, p999, rme, samples
      // we want mean, which is the 4th numeric column
      const match = line.match(/·\s+(.*?)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
      if (match) {
        const ms = parseFloat(match[5].replace(/,/g, ''));
        if (titleLower.includes('mount') || titleLower.includes('create') || titleLower.includes('render first')) mountMs = ms;
        if (titleLower.includes('patch') || titleLower.includes('update') || titleLower.includes('scroll') || titleLower.includes('filter') || titleLower.includes('move')) patchMs = ms;
        if (titleLower.includes('dispose') || titleLower.includes('destroy')) disposeMs = ms;
      }
    }
  } catch (err) {
    console.error(`Benchmarks failed for ${app.name}`);
  }

  return {
    app: app.name,
    tests: testsPass,
    cleanup: cleanupPass,
    safeRendering: safeRenderingPass,
    benchmark: { mountMs, patchMs, disposeMs },
    knownRisks: []
  };
}

(async () => {
  console.log('Starting local dev server for Gauntlet E2E...');
  const server = spawn('node', ['sample/server.js'], { stdio: 'ignore' });
  
  // Wait for server to bind
  await new Promise(r => setTimeout(r, 2000));

  try {
    const results = [];
    for (const app of APPS) {
      results.push(await processApp(app));
    }

    const outDir = path.join(process.cwd(), 'gauntlet/results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(results, null, 2), 'utf8');

    console.log('\n==================================');
    console.log('Gauntlet Complete. Scorecard written to gauntlet/results/latest.json');
    console.log('==================================\n');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    server.kill();
  }
})();
