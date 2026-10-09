const logActions = [
  'REPORT_CREATED', 'REPORT_UPDATED', 'REPORT_ESCALATED', 'REPORT_RESOLVED', 'REPORT_DELETED',
  'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILURE', 'AUTH_LOGOUT', 'AUTH_REFRESH_SUCCESS',
  'AUTH_REFRESH_FAILURE', 'AUTHORIZATION_DENIED', 'SESSION_CREATED', 'SESSION_TERMINATED', 'SESSION_EXPIRED'
];
const logsList = document.querySelector('#logs-list');
const logsStatus = document.querySelector('#logs-status');
let page = 1;

logActions.forEach((action) => document.querySelector('#log-action').append(new Option(action, action)));

function metadataList(metadata) {
  const list = document.createElement('dl');
  list.className = 'log-metadata';
  Object.entries(metadata || {}).forEach(([key, value]) => {
    const label = document.createElement('dt');
    label.textContent = key.replace(/([A-Z])/g, ' $1');
    const detail = document.createElement('dd');
    detail.textContent = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    list.append(label, detail);
  });
  return list;
}

function logItem(log) {
  const item = document.createElement('article');
  item.className = 'log-item';
  const title = document.createElement('h3');
  title.textContent = log.action;
  const summary = document.createElement('p');
  summary.textContent = `${new Date(log.createdAt).toLocaleString()} · ${log.category} · ${log.actorType}`;
  const actor = document.createElement('p');
  actor.textContent = `Actor: ${log.actorId?.email || log.actorType}`;
  const resource = document.createElement('p');
  resource.textContent = `Resource: ${log.resourceType}${log.resourceId ? ` · ${log.resourceId}` : ''}`;
  item.append(title, summary, actor, resource);
  if (log.sessionId) {
    const session = document.createElement('p');
    session.textContent = `Session: ${log.sessionId}`;
    item.append(session);
  }
  item.append(metadataList(log.metadata));
  return item;
}

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  if (user.role !== 'ADMIN') { location.href = '/'; return false; }
  document.querySelector('#welcome').textContent = `Support: ${user.email}`;
  document.querySelector('#admin-navigation').hidden = false;
  return true;
}

async function loadLogs() {
  logsStatus.textContent = 'Loading logs…';
  logsList.replaceChildren();
  const query = new URLSearchParams({ page: String(page), limit: '25', sort: 'createdAt', order: document.querySelector('#log-order').value });
  for (const [parameter, id] of [
    ['search', '#log-search'], ['category', '#log-category'], ['action', '#log-action'],
    ['actorType', '#log-actor-type'], ['resourceType', '#log-resource-type']
  ]) {
    const value = document.querySelector(id).value.trim();
    if (value) query.set(parameter, value);
  }
  try {
    const response = await fetch(`/api/admin/logs?${query}`);
    if (!response.ok) throw new Error('Could not load logs');
    const { logs, total, limit } = await response.json();
    logsStatus.textContent = total ? `${total} matching log${total === 1 ? '' : 's'}` : 'No logs match these filters.';
    logsList.replaceChildren(...logs.map(logItem));
    document.querySelector('#logs-page').textContent = `Page ${page} of ${Math.max(1, Math.ceil(total / limit))}`;
    document.querySelector('#previous-logs').disabled = page <= 1;
    document.querySelector('#next-logs').disabled = page * limit >= total;
  } catch {
    logsStatus.textContent = 'Could not load logs.';
    document.querySelector('#logs-page').textContent = '';
    document.querySelector('#previous-logs').disabled = true;
    document.querySelector('#next-logs').disabled = true;
  }
}

document.querySelector('#logs-filters').addEventListener('submit', (event) => { event.preventDefault(); page = 1; loadLogs(); });
document.querySelectorAll('#logs-filters select').forEach((select) => select.addEventListener('change', () => { page = 1; loadLogs(); }));
document.querySelector('#previous-logs').addEventListener('click', () => { page -= 1; loadLogs(); });
document.querySelector('#next-logs').addEventListener('click', () => { page += 1; loadLogs(); });
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) await loadLogs(); }
start();
