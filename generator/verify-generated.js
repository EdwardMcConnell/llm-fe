import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const irPath = 'ir/kanban-card.ir.json';
const targetPath = 'generated-examples/kanban-card/kanban-card.generated.js';
const targetTestPath = 'generated-examples/kanban-card/kanban-card.generated.test.js';

const tempPath = '.temp-gen.js';
const tempTestPath = '.temp-gen.test.js';

try {
  execSync(`node generator/index.js ${irPath} ${tempPath}`, { stdio: 'inherit' });

  const originalContent = fs.readFileSync(targetPath, 'utf8');
  const tempContent = fs.readFileSync(tempPath, 'utf8');

  if (originalContent !== tempContent) {
    console.error(`❌ Mismatch detected in ${targetPath}`);
    console.error('The generated file does not match the output of the generator.');
    console.error('Please run `npm run generate` and commit the changes.');
    process.exit(1);
  }

  const originalTestContent = fs.readFileSync(targetTestPath, 'utf8');
  let tempTestContent = fs.readFileSync(tempTestPath, 'utf8');

  // Normalize the import path because outPath basename differs during verification
  tempTestContent = tempTestContent.replace(/from '\.\/\.temp-gen\.js'/g, "from './kanban-card.generated.js'");

  if (originalTestContent !== tempTestContent) {
    console.error(`❌ Mismatch detected in ${targetTestPath}`);
    console.error('The generated test file does not match the output of the generator.');
    console.error('Please run `npm run generate` and commit the changes.');
    process.exit(1);
  }

  console.log(`✅ Reproducibility verified. Generated code matches source contract/IR.`);
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  if (fs.existsSync(tempTestPath)) fs.unlinkSync(tempTestPath);
}
