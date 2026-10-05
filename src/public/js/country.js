const countryList = document.querySelector('#country-list');
const countryName = document.querySelector('#country-name');
const countryStatus = document.querySelector('#country-status');
const searchInput = document.querySelector('#channel-search');
const sortSelect = document.querySelector('#channel-sort');
const country = new URLSearchParams(location.search).get('country') || '';
let channels = [];

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json(); document.querySelector('#welcome').textContent = `Welcome, ${user.email}`; return true;
}
function openChannel(channelId) { location.href = `/watch.html?${new URLSearchParams({ channelId })}`; }
function createChannelCard(channel) {
  const card = document.createElement('article'); card.className = 'channel-card'; card.tabIndex = 0; card.setAttribute('role', 'link');
  card.addEventListener('click', () => openChannel(channel._id)); card.addEventListener('keydown', (event) => { if (event.key === 'Enter') openChannel(channel._id); });
  const logo = document.createElement('img'); logo.src = channel.logoUrl || '/images/channel-placeholder.svg'; logo.alt = `${channel.name} logo`; logo.className = 'channel-logo'; logo.addEventListener('error', () => { logo.src = '/images/channel-placeholder.svg'; });
  const name = document.createElement('h3'); name.textContent = channel.name;
  const channelCountry = document.createElement('p'); channelCountry.className = 'channel-country'; channelCountry.textContent = channel.country;
  const categories = document.createElement('p'); categories.className = 'channel-categories'; categories.textContent = channel.categories.join(', ') || 'Live TV';
  card.append(logo, name, channelCountry, categories); return card;
}
function renderChannels() {
  const search = searchInput.value.trim().toLowerCase();
  const visibleChannels = channels.filter((channel) => channel.name.toLowerCase().includes(search));
  visibleChannels.sort((first, second) => sortSelect.value === 'newest' ? new Date(second.createdAt) - new Date(first.createdAt) : first.name.localeCompare(second.name));
  if (visibleChannels.length === 0) { countryList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: channels.length ? 'No channels found.' : 'No channels are available for this country.' })); return; }
  countryList.replaceChildren(...visibleChannels.map(createChannelCard));
}
async function loadChannels() {
  if (!country) { countryStatus.textContent = 'Choose a country from Home.'; return; }
  countryName.textContent = country;
  const response = await fetch(`/api/channels?${new URLSearchParams({ country })}`);
  if (!response.ok) { countryStatus.textContent = 'Could not load channels.'; return; }
  ({ channels } = await response.json());
  countryStatus.textContent = `${channels.length} channel${channels.length === 1 ? '' : 's'} available`;
  renderChannels();
}
searchInput.addEventListener('input', renderChannels); sortSelect.addEventListener('change', renderChannels);
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) await loadChannels(); } start();
