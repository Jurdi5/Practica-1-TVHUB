const metricsChartCanvas = document.querySelector('#support-metrics-chart');
let metricsChart;

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  if (user.role !== 'ADMIN') { location.href = '/'; return false; }
  document.querySelector('#logs-link').hidden = false;
  document.querySelector('#welcome').textContent = `Support: ${user.email}`;
  return true;
}

function renderMetrics(metrics) {
  const labels = metrics.map((metric) => metric.day);
  if (metricsChart) metricsChart.destroy();
  metricsChart = new Chart(metricsChartCanvas, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Reports resolved', data: metrics.map((metric) => metric.resolvedCount), backgroundColor: '#38bdf8' },
        { type: 'line', label: 'Average response (minutes)', data: metrics.map((metric) => Number(metric.averageResponseMinutes.toFixed(1))), borderColor: '#fbbf24', backgroundColor: '#fbbf24', yAxisID: 'response' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Resolved reports' } },
        response: { beginAtZero: true, position: 'right', title: { display: true, text: 'Minutes' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

async function loadMetrics() {
  const response = await fetch('/api/admin/reports/metrics?days=14');
  if (!response.ok) return;
  const { metrics } = await response.json();
  renderMetrics(metrics);
}

function connectMetricsSocket() {
  const socket = io();
  socket.on('report:updated', loadMetrics);
}

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() {
  if (await loadUser()) {
    await loadMetrics();
    connectMetricsSocket();
  }
}
start();
