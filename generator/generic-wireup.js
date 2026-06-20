import fs from 'fs';
import path from 'path';

export function generateGenericWireup(appIr, outDir) {
  if (!appIr.wireup) return;
  const w = appIr.wireup;
  let code = `// Compiled deterministically from ${w.rootComponent || appIr.name} App IR\n`;
  for (const imp of w.appImports) {
    code += `import { ${imp.name} } from '${imp.module}';\n`;
  }
  const hasGlobalSharedMap = w.appImports.some(i => i.name.includes('globalSharedMap'));
  const arg = hasGlobalSharedMap ? 'sharedMap = globalSharedMap' : 'sharedMap';
  code += `\nexport function ${w.exportName}(${arg}) {\n`;

  // Forms
  if (w.forms) {
    for (const form of w.forms) {
      code += `  const validate${form.name} = ${form.validate};\n`;
      code += `  const [get${form.name}Form, ${form.name}FormActions] = createFormSignal(${form.initialValues}, validate${form.name});\n`;
      if (form.syncFrom) {
        for (const sync of form.syncFrom) {
          code += `  const stored_${sync.field} = sharedMap.get('${sync.key}');\n`;
          code += `  if (stored_${sync.field} !== undefined) ${form.name}FormActions.setFieldValue('${sync.field}', stored_${sync.field});\n`;
        }
      }
      code += `\n`;
    }
  }

  // Demand
  if (w.demand) {
    for (const demand of w.demand) {
      code += `  const [get${demand.name}] = globalDemandManager.demand(sharedMap, '${demand.key}', ${demand.fetcher});\n\n`;
    }
  }

  // Event handler
  if (w.events && w.events.length > 0) {
    code += `  function handleEvent(ev) {\n`;
    for (let i = 0; i < w.events.length; i++) {
      const ev = w.events[i];
      code += `    ${i === 0 ? 'if' : '} else if'} (ev.type === '${ev.type}') {\n`;
      if (ev.extract) code += `      ${ev.extract}\n`;
      code += `      ${ev.action}\n`;
    }
    code += `    }\n  }\n\n`;
  }

  // Root App instantiation
  const rootFactory = w.appImports.find(i => i.name.includes(w.rootComponent || appIr.name) || i.module.includes(w.rootComponent || appIr.name))?.name || w.appImports[0].name;
  
  if (w.events && w.events.length > 0) {
    code += `  const app = ${rootFactory}({}, handleEvent);\n`;
  } else {
    code += `  const app = ${rootFactory}({});\n`;
  }
  
  if (w.setupCode) {
    code += `  ${w.setupCode}\n\n`;
  }
  
  // Children maps & factories
  if (w.children) {
    for (const child of w.children) {
      const cName = child.name;
      const cNameCap = cName.charAt(0).toUpperCase() + cName.slice(1);
      code += `  const ${cName}Instances = new Map();\n`;
      code += `\n  function patch${cNameCap}(statePatch) {\n`;
      code += `    const id = statePatch.id;\n`;
      code += `    let instance = ${cName}Instances.get(id);\n`;
      code += `    if (!instance) {\n`;
      if (w.events && w.events.length > 0) {
        code += `      instance = ${child.factory}(statePatch, handleEvent);\n`;
      } else {
        code += `      instance = ${child.factory}(statePatch);\n`;
      }
      code += `      ${cName}Instances.set(id, instance);\n`;
      code += `      if (instance.root) instance.root.dataset.id = id;\n`; // Bind dataset id automatically
      code += `    } else {\n`;
      code += `      instance.patch(statePatch);\n`;
      code += `    }\n`;
      
      if (child.routeProperty && child.routeMap) {
        code += `    if (statePatch.${child.routeProperty} && app.children) {\n`;
        code += `      let colName = null;\n`;
        for (const [k, v] of Object.entries(child.routeMap)) {
          code += `      if (statePatch.${child.routeProperty} === '${k}') colName = '${v}';\n`;
        }
        code += `      if (colName && app.children[colName] && app.children[colName].insert${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}) {\n`;
        code += `        app.children[colName].insert${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}(id, instance);\n`;
        code += `      }\n    }\n`;
      } else if (child.listName) {
        code += `    app.insert${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}(id, instance);\n`;
      }
      code += `  }\n`;

      code += `\n  function remove${cNameCap}(id) {\n`;
      code += `    const instance = ${cName}Instances.get(id);\n`;
      code += `    if (instance) {\n`;
      code += `      instance.dispose();\n`;
      if (child.routeProperty && child.routeMap) {
        code += `      for (const col of Object.values(app.children || {})) {\n`;
        code += `        if (col.remove${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}) col.remove${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}(id);\n`;
        code += `      }\n`;
      } else if (child.listName) {
        code += `      if (app.remove${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}) app.remove${child.listName.charAt(0).toUpperCase() + child.listName.slice(1)}(id);\n`;
      }
      code += `      ${cName}Instances.delete(id);\n`;
      code += `    }\n  }\n`;
    }
  }

  // Subscriptions processing helpers
  if (w.subscriptions) {
    for (const sub of w.subscriptions) {
      if (sub.action === 'patchItem') {
        // Handled by generic children patch method
      } else if (sub.action === 'reconcileList') {
        const lNameCap = sub.reconcileList.charAt(0).toUpperCase() + sub.reconcileList.slice(1);
        code += `\n  function reconcile${lNameCap}Order(routeKey, itemKeys) {\n`;
        if (sub.routeMap) {
          code += `    if (app.children) {\n`;
          code += `      let colName = null;\n`;
          for (const [k, v] of Object.entries(sub.routeMap)) {
            code += `      if (routeKey === '${k}') colName = '${v}';\n`;
          }
          code += `      if (colName && app.children[colName] && app.children[colName].reconcile${lNameCap}Order) {\n`;
          code += `        app.children[colName].reconcile${lNameCap}Order(itemKeys);\n`;
          code += `      }\n    }\n`;
        } else {
          code += `    if (app.reconcile${lNameCap}Order) app.reconcile${lNameCap}Order(itemKeys);\n`;
        }
        code += `  }\n`;
      }
    }
  }

  code += `\n  const cleanups = [];\n`;

  // Effects
  if (w.effects) {
    for (const effect of w.effects) {
      code += `  cleanups.push(createEffect(() => {\n`;
      code += `    ${effect.code}\n`;
      code += `  }));\n`;
    }
  }

  // observeMap
  if (w.subscriptions && w.subscriptions.length > 0) {
    code += `\n  const observeMap = () => {\n`;
    code += `    for (const [key, val] of sharedMap.entries()) {\n`;
    for (const sub of w.subscriptions) {
      let cond = sub.matchType === 'prefix' ? `key.startsWith('${sub.pattern}')` : `key === '${sub.pattern}'`;
      let actionCode = '';
      if (sub.action === 'patchItem') {
        actionCode = `patch${sub.childName.charAt(0).toUpperCase() + sub.childName.slice(1)}(val);`;
      } else if (sub.action === 'reconcileList') {
        actionCode = `reconcile${sub.reconcileList.charAt(0).toUpperCase() + sub.reconcileList.slice(1)}Order(${sub.extractKey}, val.${sub.valuePath});`;
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

    // listen
    code += `
  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
`;
    for (const sub of w.subscriptions) {
      let cond = sub.matchType === 'prefix' ? `key.startsWith('${sub.pattern}')` : `key === '${sub.pattern}'`;
      let actionCode = '';
      if (sub.action === 'patchItem') {
        const cNameCap = sub.childName.charAt(0).toUpperCase() + sub.childName.slice(1);
        actionCode = `if (val) patch${cNameCap}(val);\n      else remove${cNameCap}(key.split(':')[2]);`;
      } else if (sub.action === 'reconcileList') {
        actionCode = `if (val) reconcile${sub.reconcileList.charAt(0).toUpperCase() + sub.reconcileList.slice(1)}Order(${sub.extractKey}, val.${sub.valuePath});`;
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
      code += `      for (const instance of ${child.name}Instances.values()) instance.dispose();\n`;
      code += `      ${child.name}Instances.clear();\n`;
    }
  }
  code += `      app.dispose();\n`;
  code += `      cleanups.forEach(c => c());\n`;
  code += `    }\n  };\n}\n`;

  fs.writeFileSync(path.join(outDir, w.moduleName), code);
}
