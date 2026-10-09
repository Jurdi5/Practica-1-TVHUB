const channelList = document.querySelector('#channel-list');
const channelStatus = document.querySelector('#channel-status');
const searchInput = document.querySelector('#channel-search');
const categoryFilter = document.querySelector('#category-filter');
let favoriteChannelIds = new Set();
let categoryNames = [];

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  document.querySelector('#welcome').textContent = `Welcome, ${user.email}`;
  return true;
}

async function loadFavorites() {
  const response = await fetch('/api/favorites');
  if (!response.ok) return;
  const { favorites } = await response.json();
  favoriteChannelIds = new Set(favorites.filter((favorite) => favorite.channelId).map((favorite) => favorite.channelId._id));
}

async function toggleFavorite(channelId) {
  const isFavorite = favoriteChannelIds.has(channelId);
  const response = await fetch(`/api/favorites/${channelId}`, { method: isFavorite ? 'DELETE' : 'POST' });
  if (!response.ok) { channelStatus.textContent = 'Could not update favorites.'; return; }
  if (isFavorite) favoriteChannelIds.delete(channelId);
  else favoriteChannelIds.add(channelId);
  loadChannels();
}

function openChannel(channelId) {
  location.href = `/watch.html?${new URLSearchParams({ channelId })}`;
}

function reportChannel(channelId) {
  location.href = `/reports.html?${new URLSearchParams({ channelId })}`;
}

function createChannelCard(channel) {
  const card = document.createElement('article');
  card.className = 'channel-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.addEventListener('click', () => openChannel(channel._id));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') openChannel(channel._id);
  });

  const logo = document.createElement('img');
  logo.src = channel.logoUrl || '/images/channel-placeholder.svg';
  logo.alt = `${channel.name} logo`;
  logo.className = 'channel-logo';
  logo.addEventListener('error', () => { logo.src = '/images/channel-placeholder.svg'; });
  const name = document.createElement('h3');
  name.textContent = channel.name;
  const favoriteButton = document.createElement('button');
  const isFavorite = favoriteChannelIds.has(channel._id);
  favoriteButton.type = 'button';
  favoriteButton.className = 'favorite-button';
  favoriteButton.textContent = isFavorite ? '★' : '☆';
  favoriteButton.setAttribute('aria-label', isFavorite ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`);
  favoriteButton.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(channel._id); });
  const reportButton = document.createElement('button');
  reportButton.type = 'button';
  reportButton.className = 'report-button';
  reportButton.textContent = 'Report problem';
  reportButton.setAttribute('aria-label', `Report a problem with ${channel.name}`);
  reportButton.addEventListener('click', (event) => { event.stopPropagation(); reportChannel(channel._id); });
  const header = document.createElement('div');
  header.className = 'channel-card-header';
  const actions = document.createElement('div');
  actions.className = 'channel-card-actions';
  actions.append(favoriteButton, reportButton);
  header.append(name, actions);
  const country = document.createElement('p');
  country.className = 'channel-country';
  country.textContent = channel.country;
  const categories = document.createElement('p');
  categories.className = 'channel-categories';
  categories.textContent = channel.categories.join(', ') || 'Live TV';
  card.append(logo, header, country, categories);
  return card;
}

function createCountrySection(country, channels) {
  const section = document.createElement('section');
  section.className = 'category-section';
  const header = document.createElement('div');
  header.className = 'country-heading';
  const heading = document.createElement('h2');
  heading.textContent = country;
  const viewAll = document.createElement('a');
  viewAll.className = 'view-all-link';
  viewAll.href = `/country.html?${new URLSearchParams({ country })}`;
  viewAll.textContent = 'View all';
  header.append(heading, viewAll);
  const row = document.createElement('div');
  row.className = 'channel-row';
  row.append(...channels.slice(0, 5).map(createChannelCard));
  section.append(header, row);
  return section;
}

function updateCategoryFilter(channels) {
  // Keep the full initial list visible while a category filter is active.
  if (categoryFilter.value) return;
  const names = [...new Set(channels.flatMap((channel) => channel.categories))].sort();
  if (names.join('|') === categoryNames.join('|')) return;
  categoryNames = names;
  const selectedCategory = categoryFilter.value;
  categoryFilter.replaceChildren(new Option('All categories', ''), ...names.map((name) => new Option(name, name)));
  categoryFilter.value = selectedCategory;
}

function displayChannels(channels) {
  if (channels.length === 0) {
    channelList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'No channels found.' }));
    return;
  }
  const byCountry = new Map();
  for (const channel of channels) {
    const countryChannels = byCountry.get(channel.country) || [];
    countryChannels.push(channel);
    byCountry.set(channel.country, countryChannels);
  }
  channelList.replaceChildren(...[...byCountry.entries()].map(([country, countryChannels]) => createCountrySection(country, countryChannels)));
}

async function loadChannels() {
  channelStatus.textContent = 'Loading live channels…';
  const query = new URLSearchParams();
  if (searchInput.value.trim()) query.set('search', searchInput.value.trim());
  if (categoryFilter.value) query.set('category', categoryFilter.value);
  const response = await fetch(`/api/channels${query.size ? `?${query}` : ''}`);
  if (!response.ok) { channelStatus.textContent = 'Could not load channels.'; return; }
  const { channels } = await response.json();
  updateCategoryFilter(channels);
  channelStatus.textContent = `${channels.length} live channel${channels.length === 1 ? '' : 's'}`;
  displayChannels(channels);
}

searchInput.addEventListener('input', loadChannels);
categoryFilter.addEventListener('change', loadChannels);
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });

async function start() {
  if (!await loadUser()) return;
  await loadFavorites();
  await loadChannels();
}

start();
