import fs from 'fs';
import path from 'path';

const appContractPath = process.argv[2];

if (!appContractPath) {
  console.error("Usage: node generator/app-generator.js <path-to-app-contract.json>");
  process.exit(1);
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function generateApp() {
  const appContract = loadJson(appContractPath);
  const appName = appContract.app;
  const outDir = 'generated-examples/' + appName;
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Load root IR
  let irFileName = `ir/${appName}.ir.json`;
  if (appName === 'live-dashboard') irFileName = `ir/live-dashboard-app.ir.json`; // Handle exception
  
  const appIr = loadJson(irFileName);
  
  // 2. Data-grid exception
  if (appName === 'data-grid') {
    const { generateDataGrid } = await import('./data-grid-generator.js');
    generateDataGrid(appContract, appIr, outDir);
    return;
  }

  const { generateComponent, validateRuntimeAPI } = await import('./index.js');
  const { generateGenericWireup } = await import('./generic-wireup.js');

  // 3. Components to Generate
  // Kanban uses appIr.components. Others use the root object.
  const componentsToGenerate = appIr.components || [appIr];
  
  for (const comp of componentsToGenerate) {
    if (!comp.name) continue;
    validateRuntimeAPI(comp);
    
    // contract is either app-level or component-level
    let contractP = `contracts/${comp.name}.contract.json`;
    if (!fs.existsSync(contractP)) contractP = appContractPath;
    
    const contract = loadJson(contractP);
    
    generateComponent(
      contract, 
      comp, 
      contractP, 
      irFileName, 
      path.join(outDir, `${comp.name}.generated.js`)
    );
  }

  // 4. Dependencies
  if (appIr.dependencies) {
    for (const dep of appIr.dependencies) {
      const depIr = loadJson(`ir/${dep}`);
      validateRuntimeAPI(depIr);
      const name = dep.replace('.ir.json', '');
      const contractP = `contracts/${name}.contract.json`;
      generateComponent(
        loadJson(contractP), 
        depIr, 
        contractP, 
        `ir/${dep}`, 
        path.join(outDir, `${name}.generated.js`)
      );
    }
  }

  // 5. Generic Wireup
  if (appIr.wireup) {
    generateGenericWireup(appIr, outDir);
  }

  // 6. Custom Wireups
  const wireups = appIr.customWireups || (appIr.app && appIr.app.customWireups) || [];
  for (const cw of wireups) {
    fs.copyFileSync(cw.source, path.join(outDir, cw.target));
  }
}

try {
  await generateApp();
} catch (e) {
  console.error(e.stack);
  process.exit(1);
}
