// Compiled deterministically from demo-shell App IR
import { createDemoShellApp } from './demo-shell.generated.js';

export function createDemoShell(sharedMap) {
  function handleEvent(ev) {
    if (ev.type === 'demo:nav:kanban') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'kanban' });
    } else if (ev.type === 'demo:nav:grid') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'grid' });
    } else if (ev.type === 'demo:nav:dashboard') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'dashboard' });
    } else if (ev.type === 'demo:nav:settings') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'settings' });
    } else if (ev.type === 'demo:nav:catalog') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'catalog' });
    } else if (ev.type === 'demo:nav:ops') {
      ev.sourceEvent.preventDefault();
      sharedMap.set('demo:route', { route: 'ops' });
    }
  }

  const app = createDemoShellApp({}, handleEvent);

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key === 'demo:route') {
        app.patch({ activeRoute: val.route });
      }
    }
  };

  const disposeSub = sharedMap.onPatch((patch) => {
    const key = patch.key;
    const val = patch.value;
    if (key === 'demo:route') {
      if (val !== undefined) app.patch({ activeRoute: val.route });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
