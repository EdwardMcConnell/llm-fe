import fs from 'fs';
import path from 'path';

function safeClassToken(val) {
  return String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function generate(irPath) {
  const irRaw = fs.readFileSync(irPath, 'utf8');
  const ir = JSON.parse(irRaw);

  const componentName = path.basename(ir.module).split('.')[0];
  const fnName = 'create' + componentName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  let code = `// MACHINE GENERATED FILE. DO NOT EDIT BY HAND.\n\n`;

  // Helper functions
  code += `function safeClassToken(val) {
  if (val == null) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9-]/g, '-');
}\n\n`;

  code += `function formatCurrency(val) {
  if (val == null) return '';
  return '$' + Number(val).toFixed(2);
}\n\n`;

  code += `export function ${fnName}(initialState, eventSink) {
  const template = document.createElement('template');
  template.innerHTML = \`${ir.create.template}\`;
  
  const root = template.content.firstElementChild.cloneNode(true);
`;

  // References
  const refVars = [];
  for (const [refName, selector] of Object.entries(ir.create.refs)) {
    if (refName === 'root') continue; // Already got root
    code += `  const ${refName}Element = root.matches(\`${selector}\`) ? root : root.querySelector(\`${selector}\`);\n`;
    refVars.push(refName);
  }
  
  // Text node setup for things that use setTextNodeValue
  for (const patch of ir.patches) {
    for (const op of patch.ops) {
      if (op.op === 'setTextNodeValue') {
        code += `  const ${op.ref}TextNode = document.createTextNode('');\n`;
        code += `  ${op.ref}Element.appendChild(${op.ref}TextNode);\n`;
      }
    }
  }

  code += `\n`;

  // State vars
  for (const patch of ir.patches) {
    code += `  let current${patch.input.charAt(0).toUpperCase() + patch.input.slice(1)};\n`;
  }
  
  code += `\n`;

  // Patch functions
  for (const patch of ir.patches) {
    const varName = `current${patch.input.charAt(0).toUpperCase() + patch.input.slice(1)}`;
    code += `  function ${patch.name}(nextVal) {
    if (${varName} === nextVal) return;
    ${varName} = nextVal;
`;
    for (const op of patch.ops) {
      if (op.op === 'setTextNodeValue') {
        if (op.format === 'currency') {
          code += `    ${op.ref}TextNode.nodeValue = formatCurrency(nextVal);\n`;
        } else {
          code += `    ${op.ref}TextNode.nodeValue = nextVal == null ? '' : String(nextVal);\n`;
        }
      } else if (op.op === 'setTextContent') {
        code += `    ${op.ref}Element.textContent = nextVal == null ? '' : String(nextVal);\n`;
      } else if (op.op === 'setClassToken') {
        code += `    ${op.ref}Element.className = \`${op.prefix}\${safeClassToken(nextVal)}\`;\n`;
      }
    }
    code += `  }\n\n`;
  }

  // Events
  const handlers = [];
  for (const ev of ir.events) {
    code += `  function handle${ev.name}(event) {
    eventSink({ type: '${ev.emits}', sourceEvent: event });
  }
  ${ev.target === 'root' ? 'root' : ev.target + 'Element'}.addEventListener('${ev.type}', handle${ev.name});\n\n`;
    handlers.push(ev);
  }

  // Master patch
  code += `  function patch(nextState) {
`;
  for (const patch of ir.patches) {
    code += `    ${patch.name}(nextState.${patch.input});\n`;
  }
  code += `  }\n\n`;

  // Dispose
  code += `  function dispose() {
`;
  for (const ev of handlers) {
    if (ev.cleanup) {
      code += `    ${ev.target === 'root' ? 'root' : ev.target + 'Element'}.removeEventListener('${ev.type}', handle${ev.name});\n`;
    }
  }
  code += `  }\n\n`;

  code += `  patch(initialState);\n\n`;
  code += `  return { root, patch, dispose };\n`;
  code += `}\n`;

  const outPath = path.join(process.cwd(), ir.module);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, code, 'utf8');
  console.log('Generated:', outPath);
}

const args = process.argv.slice(2);
if (args[0]) {
  generate(args[0]);
} else {
  console.error("Usage: node generator/index.js <path-to-ir.json>");
  process.exit(1);
}
