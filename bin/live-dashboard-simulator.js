import fs from 'fs';
import path from 'path';

function generateSimulatedData() {
  const widgets = [];
  for (let i = 0; i < 6; i++) {
    const history = [];
    let val = 50;
    for (let j = 0; j < 30; j++) {
      val = Math.max(0, Math.min(100, val + (Math.random() * 20 - 10)));
      history.push(Math.round(val));
    }
    const status = history[29] > 80 ? 'critical' : history[29] > 60 ? 'warning' : 'normal';
    widgets.push({
      id: `w${i}`,
      title: `Telemetry ${i}`,
      currentValue: history[29],
      history,
      status
    });
  }
  return { widgetsIndex: widgets.map(w => w.id), widgets };
}

console.log(JSON.stringify(generateSimulatedData(), null, 2));
