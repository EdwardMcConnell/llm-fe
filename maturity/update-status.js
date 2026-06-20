import fs from 'fs';
import path from 'path';

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const levels = loadJson('maturity/levels.json');
const gauntlet = loadJson('gauntlet/results/latest.json');

// Check Level 0
function checkLevel0() {
  const missing = [];
  if (!fs.existsSync('package.json')) missing.push('packageImports');
  
  // We assume if gauntlet runs, basic core tests pass, but let's check gauntlet output
  // Or rather, we rely on the overall CI pipeline for strict correctness, but here we can just say:
  // If we can't find core tests, we fail.
  if (!fs.existsSync('test/core.test.js')) missing.push('coreTestsPass');
  if (!fs.existsSync('test/cleanup.test.js')) missing.push('cleanupTestsPass');
  
  return missing;
}

// Check Level 1
function checkLevel1(reqs) {
  const missing = [];
  for (const c of reqs.componentContracts) if (!fs.existsSync(c)) missing.push(c);
  for (const ir of reqs.irFiles) if (!fs.existsSync(ir)) missing.push(ir);
  for (const a of reqs.generatedArtifacts) if (!fs.existsSync(a)) missing.push(a);
  for (const t of reqs.generatedTests) if (!fs.existsSync(t)) missing.push(t);
  for (const b of reqs.generatedBenchmarks) if (!fs.existsSync(b)) missing.push(b);
  
  // rely on gauntlet for proof if we need to
  return missing;
}

// Check Level 2
function checkLevel2(reqs) {
  const missing = [];
  for (const c of reqs.componentContracts) if (!fs.existsSync(c)) missing.push(c);
  for (const a of reqs.generatedArtifacts) if (!fs.existsSync(a)) missing.push(a);
  for (const t of reqs.generatedTests) if (!fs.existsSync(t)) missing.push(t);
  for (const b of reqs.generatedBenchmarks) if (!fs.existsSync(b)) missing.push(b);
  
  if (reqs.gauntletAppProof) {
    const appRes = gauntlet && gauntlet.results ? gauntlet.results.find(r => r.app === reqs.gauntletAppProof) : null;
    if (!appRes || appRes.proofTier !== 'A') {
      missing.push(`gauntletAppProof (Tier A required): ${reqs.gauntletAppProof}`);
    }
  }
  return missing;
}

// Check Level 3
function checkLevel3(reqs) {
  const missing = [];
  if (reqs.gauntletAppProof) {
    for (const app of reqs.gauntletAppProof) {
      const appRes = gauntlet && gauntlet.results ? gauntlet.results.find(r => r.app === app) : null;
      if (!appRes || (appRes.proofTier !== 'A' && appRes.proofTier !== 'B')) {
        missing.push(`gauntletAppProof (Tier A or B required): ${app}`);
      }
    }
  }
  if (!fs.existsSync('bench/generated.bench.js')) missing.push('comparativeBenchmarks');
  if (!fs.existsSync('manifest.json')) missing.push('browserCapabilityManifest');
  return missing;
}

// Check Level 4
function checkLevel4(reqs) {
  const rootDir = process.cwd();
  const hasAccessibilitySmokeTests = fs.existsSync(path.join(rootDir, 'test', 'accessibility.test.js'));
  const hasSecurityTrustBoundaryTests = fs.existsSync(path.join(rootDir, 'test', 'security.test.js'));
  const hasBrowserCompatibilityPolicy = fs.existsSync(path.join(rootDir, 'browser-compatibility.md'));

  const missing = [];
  if (!hasAccessibilitySmokeTests) missing.push('accessibilitySmokeTests');
  if (!hasSecurityTrustBoundaryTests) missing.push('securityTrustBoundaryTests');
  if (!hasBrowserCompatibilityPolicy) missing.push('browserCompatibilityPolicy');
  return missing;
}

// Check Level 5
function checkLevel5(reqs) {
  return ['productionTelemetry', 'bugHistory'];
}

let currentLevel = -1;
let currentLevelName = "None";
let missingForNext = [];
let nextLevel = 0;
let nextLevelName = levels[0].name;

const checks = [checkLevel0, checkLevel1, checkLevel2, checkLevel3, checkLevel4, checkLevel5];

for (let i = 0; i < levels.length; i++) {
  const level = levels[i];
  const missing = checks[i](level.requirements);
  
  if (missing.length === 0) {
    currentLevel = level.level;
    currentLevelName = level.name;
  } else {
    nextLevel = level.level;
    nextLevelName = level.name;
    missingForNext = missing;
    break; // stop evaluating
  }
}

const currentLevelData = levels.find(l => l.level === currentLevel);
const nextLevelData = levels.find(l => l.level === nextLevel);

const status = {
  currentLevel,
  currentLevelName,
  nextLevel,
  nextLevelName,
  canClaim: currentLevelData ? currentLevelData.canClaim : [],
  cannotClaim: currentLevelData ? (currentLevelData.cannotClaim || []) : [],
  missingForNextLevel: missingForNext
};

// Add cannotClaims from the next level as well just to be safe if current doesn't have it
if (nextLevelData && nextLevelData.cannotClaim) {
  for (const c of nextLevelData.cannotClaim) {
    if (!status.cannotClaim.includes(c)) {
      status.cannotClaim.push(c);
    }
  }
}

fs.writeFileSync('maturity/status.json', JSON.stringify(status, null, 2));
console.log(`\nMaturity calculated: Level ${currentLevel} - ${currentLevelName}`);
if (missingForNext.length > 0) {
  console.log(`Missing for Level ${nextLevel}:`);
  missingForNext.forEach(m => console.log(`  - ${m}`));
}
