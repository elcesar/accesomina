const endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';
const fileUrl = 'file:///Users/ricardo.hornig/Documents/Acceso%20Mina%20/Acceso%20Mina/AccesoMina_v6.html';

const target = await fetch(`${endpoint}/json/new?${encodeURIComponent(fileUrl)}`, { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const events = [];

ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  } else {
    events.push(message);
  }
};

await new Promise(resolve => { ws.onopen = resolve; });

function send(method, params = {}) {
  return new Promise(resolve => {
    const call = { id: ++id, method, params };
    pending.set(call.id, resolve);
    ws.send(JSON.stringify(call));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.result?.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text || 'Error ejecutando validación en navegador');
  }
  return response.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await new Promise(resolve => setTimeout(resolve, 2500));

await evaluate(`
  document.getElementById('login-rut').value='78.425.213-2';
  document.getElementById('login-email').value='contacto@domian.cl';
  loginTenant();
`);
await new Promise(resolve => setTimeout(resolve, 1200));

const dashboard = await evaluate(`({
  private: document.body.classList.contains('private'),
  title: document.getElementById('topbar-title')?.textContent || '',
  commercial: !!document.getElementById('dash-v97-commercial'),
  industries: [...document.querySelectorAll('#industries-v97-list .badge')].map(x => x.textContent.trim()),
  onboarding: !!document.getElementById('onboarding-v97-route'),
  kpis: document.querySelectorAll('#kpi-dash .kpi').length
})`);

await evaluate(`nav('operaciones-cloud')`);
await new Promise(resolve => setTimeout(resolve, 1000));
const operaciones = await evaluate(`({
  page: document.getElementById('page-operaciones-cloud')?.classList.contains('active'),
  dispatch: !!document.getElementById('ops-v97-dispatch'),
  docai: !!document.getElementById('ops-v97-docai'),
  dispatchRows: document.querySelectorAll('#ops-v97-dispatch .cloud-note').length,
  docRows: document.querySelectorAll('#ops-v97-docai tbody tr').length
})`);

await evaluate(`nav('reportes')`);
await new Promise(resolve => setTimeout(resolve, 800));
const reportes = await evaluate(`({
  page: document.getElementById('page-reportes')?.classList.contains('active'),
  commercial: !!document.getElementById('reports-v97-commercial'),
  reportCards: document.querySelectorAll('#reports-v97-commercial .cloud-note').length
})`);

const errors = events
  .filter(event => event.method === 'Runtime.exceptionThrown' || (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error'))
  .map(event => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method);

const result = { dashboard, operaciones, reportes, errors };
console.log(JSON.stringify(result, null, 2));

ws.close();
await fetch(`${endpoint}/json/close/${target.id}`).catch(() => {});
