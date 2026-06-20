import fs from 'fs';
import path from 'path';

export function generateGenericWireup(appIr, outDir) {
  if (!appIr.wireup) return;
  const w = appIr.wireup;
  let code = `// Compiled deterministically from ${w.rootComponent || appIr.name} App IR\n`;
  for (const imp of w.appImports) {
    code += `import { ${imp.name} } from '${imp.module}';\n`;
  }
  code += `\nexport function ${w.exportName}(sharedMap) {\n`;
  
  // Root App instantiation
  const rootFactory = w.appImports.find(i => i.name.includes(w.rootComponent || appIr.name) || i.module.includes(w.rootComponent || appIr.name))?.name || w.appImports[0].name;
  code += `  const app = ${rootFactory}({});\n`;
  
  // Children maps
  if (w.children) {
    for (const child of w.children) {
      code += `  const ${child.name}s = new Map();\n`;
    }
  }

  // Patch child helper
  if (w.children) {
    for (const child of w.children) {
      code += `\n  function patch${child.name.charAt(0).toUpperCase() + child.name.slice(1)}(statePatch) {\n`;
      code += `    const id = statePatch.id;\n`;
      code += `    let instance = ${child.name}s.get(id);\n`;
      code += `    if (!instance) {\n`;
      code += `      instance = ${child.factory}(statePatch);\n`;
      code += `      ${child.name}s.set(id, instance);\n`;
      // which list does it go into? Need to check subscriptions.
      const sub = w.subscriptions.find(s => s.action === 'patchChild' && s.childName === child.name);
      if (sub && sub.insertList) {
        code += `      app.insert${sub.insertList.charAt(0).toUpperCase() + sub.insertList.slice(1)}(id, instance);\n`;
      }
      code += `    } else {\n`;
      code += `      instance.patch(statePatch);\n`;
      code += `    }\n`;
      code += `  }\n`;
    }
  }

  code += `\n  const cleanups = [];\n`;

  // observeMap
  if (w.subscriptions && w.subscriptions.length > 0) {
    code += `\n  const observeMap = () => {\n`;
    code += `    for (const [key, val] of sharedMap.entries()) {\n`;
    for (const sub of w.subscriptions) {
      let cond = sub.matchType === 'prefix' ? `key.startsWith('${sub.pattern}')` : `key === '${sub.pattern}'`;
      let actionCode = '';
      if (sub.action === 'patchChild') {
        actionCode = `patch${sub.childName.charAt(0).toUpperCase() + sub.childName.slice(1)}(val);`;
      } else if (sub.action === 'patchApp') {
        let valAccessor = sub.valuePath ? `val.${sub.valuePath}` : `val`;
        actionCode = `app.patch({ ${sub.input}: ${valAccessor} });`;
      }
      code += `      if (${cond}) {\n        ${actionCode}\n      } else `;
    }
    if (w.subscriptions.length > 0) {
      code = code.slice(0, -6); // remove ' else '
      code += `\n`;
    }
    code += `    }\n`;
    code += `  };\n`;

    // subscribe
    code += `\n  const disposeSub = sharedMap.subscribe((key, val) => {\n`;
    for (const sub of w.subscriptions) {
      let cond = sub.matchType === 'prefix' ? `key.startsWith('${sub.pattern}')` : `key === '${sub.pattern}'`;
      let actionCode = '';
      if (sub.action === 'patchChild') {
        actionCode = `if (val) patch${sub.childName.charAt(0).toUpperCase() + sub.childName.slice(1)}(val);`;
      } else if (sub.action === 'patchApp') {
        let valAccessor = sub.valuePath ? `val.${sub.valuePath}` : `val`;
        actionCode = `if (val) app.patch({ ${sub.input}: ${valAccessor} });`;
      }
      code += `    if (${cond}) {\n      ${actionCode}\n    } else `;
    }
    if (w.subscriptions.length > 0) {
      code = code.slice(0, -6); // remove ' else '
      code += `\n`;
    }
    code += `  });\n`;
    code += `  \n  cleanups.push(disposeSub);\n`;
    code += `  observeMap();\n`;
  }

  // return
  code += `\n  return {\n`;
  code += `    root: app.root,\n`;
  code += `    dispose: () => {\n`;
  if (w.children) {
    for (const child of w.children) {
      code += `      for (const instance of ${child.name}s.values()) instance.dispose();\n`;
      code += `      ${child.name}s.clear();\n`;
    }
  }
  code += `      app.dispose();\n`;
  code += `      cleanups.forEach(c => c());\n`;
  code += `    }\n  };\n}\n`;

  fs.writeFileSync(path.join(outDir, w.moduleName), code);
}
