const reportsList = document.querySelector('#reports-list');
const reportsStatus = document.querySelector('#reports-status');
const reportsFilter = document.querySelector('#reports-filter');
const reportLogsPanel = document.querySelector('#report-logs-panel');
const reportLogsStatus = document.querySelector('#report-logs-status');
const reportLogsList = document.querySelector('#report-logs-list');

function renderLogMetadata(metadata) {
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

function renderReportLog(log) {
  const item = document.createElement('article');
  item.className = 'log-item';
  const title = document.createElement('h3');
  title.textContent = log.action;
  const summary = document.createElement('p');
  summary.textContent = `${new Date(log.createdAt).toLocaleString()} · ${log.category} · ${log.actorId?.email || log.actorType} (${log.actorType})`;
  item.append(title, summary, renderLogMetadata(log.metadata));
  return item;
}

async function showReportLogs(reportId) {
  reportLogsPanel.hidden = false;
  document.querySelector('#report-logs-title').textContent = `Report ${reportId} logs`;
  reportLogsStatus.textContent = 'Loading logs…';
  reportLogsList.replaceChildren();
  reportLogsPanel.scrollIntoView({ behavior: 'smooth' });
  try {
    const response = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}/logs`);
    if (!response.ok) throw new Error('Could not load report logs.');
    const { logs } = await response.json();
    reportLogsStatus.textContent = logs.length ? `${logs.length} log${logs.length === 1 ? '' : 's'}` : 'No logs for this report.';
    reportLogsList.replaceChildren(...logs.map(renderReportLog));
  } catch {
    reportLogsStatus.textContent = 'Could not load report logs.';
  }
}

function formatReason(reason) {
  return reason.toLowerCase().split('_').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ');
}

function createReportItem(report) {
  const item = document.createElement('article');
  item.className = 'report-item';
  item.dataset.reportId = report._id;
  const channel = document.createElement('h3');
  channel.textContent = report.channelId?.name || 'Channel unavailable';
  const reporter = document.createElement('p');
  reporter.textContent = `Reported by: ${report.userId?.email || 'User unavailable'}`;
  const reason = document.createElement('p');
  reason.textContent = `Reason: ${formatReason(report.reason)}`;
  const description = document.createElement('p');
  description.textContent = report.description;
  const status = document.createElement('p');
  status.className = 'report-status';
  status.textContent = report.status;
  const created = document.createElement('p');
  created.className = 'report-date';
  created.textContent = new Date(report.createdAt).toLocaleString();
  item.append(channel, reporter, reason, description, status, created);
  if (report.status !== 'RESOLVED') {
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Close report';
    closeButton.addEventListener('click', () => closeReport(report._id));
    item.append(closeButton);
  }
  const logsButton = document.createElement('button');
  logsButton.type = 'button';
  logsButton.textContent = 'Logs';
  logsButton.addEventListener('click', () => showReportLogs(report._id));
  item.append(logsButton);
  return item;
}

function updateReportsCount() {
  const count = reportsList.querySelectorAll('.report-item').length;
  reportsStatus.textContent = `${count} report${count === 1 ? '' : 's'}`;
}

function applyRealtimeReport(report, isNew) {
  const existing = reportsList.querySelector(`[data-report-id="${report._id}"]`);
  if (!reportMatchesFilter(report)) {
    existing?.remove();
    updateReportsCount();
    return;
  }
  const item = createReportItem(report);
  if (existing) {
    existing.replaceWith(item);
  } else {
    const emptyState = reportsList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    reportsList.prepend(item);
  }
  updateReportsCount();
}

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  if (user.role !== 'ADMIN') { location.href = '/'; return false; }
  document.querySelector('#logs-link').hidden = false;
  document.querySelector('#welcome').textContent = `Support: ${user.email}`;
  return true;
}

async function loadReports() {
  const response = await fetch(`/api/admin/reports?${new URLSearchParams({ filter: reportsFilter.value })}`);
  if (!response.ok) { reportsStatus.textContent = 'Could not load reports.'; return; }
  const { reports } = await response.json();
  reportsStatus.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
  if (reports.length === 0) {
    reportsList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'There are no reports yet.' }));
    return;
  }
  reportsList.replaceChildren(...reports.map(createReportItem));
}

function reportMatchesFilter(report) {
  if (reportsFilter.value === 'all') return true;
  if (reportsFilter.value === 'closed') return report.status === 'RESOLVED';
  return report.status !== 'RESOLVED';
}

async function closeReport(reportId) {
  const response = await fetch(`/api/admin/reports/${reportId}/close`, { method: 'PATCH' });
  if (!response.ok) {
    reportsStatus.textContent = 'Could not close report.';
    return;
  }
  const { report } = await response.json();
  applyRealtimeReport(report, false);
}

function connectSupportSocket() {
  const socket = io();
  socket.on('report:created', (report) => applyRealtimeReport(report, true));
  socket.on('report:updated', (report) => applyRealtimeReport(report, false));
}

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
reportsFilter.addEventListener('change', loadReports);
document.querySelector('#close-report-logs').addEventListener('click', () => { reportLogsPanel.hidden = true; });
async function start() {
  if (await loadUser()) {
    await loadReports();
    connectSupportSocket();
  }
}
start();
