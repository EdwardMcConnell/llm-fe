// Compiled deterministically from Live Dashboard App IR
import { createLiveDashboardApp } from './live-dashboard-app.generated.js';
import { createLiveDashboardWidget } from './live-dashboard-widget.generated.js';

export function createDashboard(sharedMap) {
  const app = createLiveDashboardApp({});
  const widgets = new Map();

  function patchWidget(statePatch) {
    const id = statePatch.id;
    let widget = widgets.get(id);
    if (!widget) {
      widget = createLiveDashboardWidget(statePatch);
      widgets.set(id, widget);
      app.insertWidgets(id, widget);
    } else {
      widget.patch(statePatch);
    }
  }

  const cleanups = [];

  const observeMap = () => {
    for (const [key, val] of sharedMap.entries()) {
      if (key.startsWith('dashboard:widget:')) {
        patchWidget(val);
      } else if (key === 'dashboard:index') {
        app.patch({ widgetsIndex: val.itemIds });
      }
    }
  };

  const disposeSub = sharedMap.subscribe((key, val) => {
    if (key.startsWith('dashboard:widget:')) {
      if (val) patchWidget(val);
    } else if (key === 'dashboard:index') {
      if (val) app.patch({ widgetsIndex: val.itemIds });
    }
  });
  
  cleanups.push(disposeSub);
  observeMap();

  return {
    root: app.root,
    dispose: () => {
      for (const widget of widgets.values()) widget.dispose();
      widgets.clear();
      app.dispose();
      cleanups.forEach(c => c());
    }
  };
}
