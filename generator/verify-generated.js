import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const reqs = loadJson('gauntlet/proof-requirements.json');
if (!reqs) {
  console.error('❌ Could not load gauntlet/proof-requirements.json');
  process.exit(1);
}

// Collect all generated artifacts from maturity requirements
const allGeneratedFiles = new Set();
for (const app of Object.keys(reqs)) {
  const appReqs = reqs[app];
  if (appReqs.generatedArtifacts) {
    appReqs.generatedArtifacts.forEach(f => {
      const artifactDirName = f.replace('.generated.js', '').replace('.generated.test.js', '');
      const path1 = path.join('generated-examples', artifactDirName, f);
      const path2 = path.join('generated-examples', app, f);
      
      if (fs.existsSync(path1)) allGeneratedFiles.add(path1);
      else if (fs.existsSync(path2)) allGeneratedFiles.add(path2);
      else allGeneratedFiles.add(path1); // default to something to show failure
    });
  }
}

let driftDetected = false;

// Check git status for each tracked generated file
// Since verify:all runs the generators before this script,
// any file that differs from what is currently committed will show up in git status.
for (const file of allGeneratedFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing generated file: ${file}`);
    driftDetected = true;
    continue;
  }
  
  try {
    // If the file has unstaged or staged changes relative to HEAD, it drifted.
    // Note: If this is run locally and the user hasn't committed yet, this will fail.
    // This is intentional. verify:all ensures that checked-in code matches the generator output.
    const status = execSync(`git status --porcelain "${file}"`, { encoding: 'utf8' }).trim();
    if (status) {
      console.error(`❌ Mismatch/Drift detected in ${file}`);
      console.error(`   Git status: ${status}`);
      driftDetected = true;
    }
  } catch (e) {
    console.error(`❌ Error checking git status for ${file}:`, e.message);
    driftDetected = true;
  }
}

if (driftDetected) {
  console.error('\n❌ The generated files do not match the committed versions or are missing.');
  console.error('Please run `npm run verify:all` locally and commit the updated generated files.');
  process.exit(1);
}

console.log(`✅ Reproducibility verified. All ${allGeneratedFiles.size} generated artifacts match committed source.`);
