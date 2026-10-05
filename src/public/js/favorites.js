const favoritesList = document.querySelector('#favorites-list');
const favoritesStatus = document.querySelector('#favorites-status');
const searchInput = document.querySelector('#favorite-search');
const sortSelect = document.querySelector('#favorite-sort');
let favorites = [];

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  document.querySelector('#welcome').textContent = `Welcome, ${user.email}`;
  return true;
}

function openChannel(channelId) { location.href = `/watch.html?${new URLSearchParams({ channelId })}`; }

function createFavoriteCard(favorite) {
  const channel = favorite.channelId;
  const card = document.createElement('article');
  card.className = 'channel-card'; card.tabIndex = 0; card.setAttribute('role', 'link');
  card.addEventListener('click', () => openChannel(channel._id));
  card.addEventListener('keydown', (event) => { if (event.key === 'Enter') openChannel(channel._id); });
  const logo = document.createElement('img'); logo.src = channel.logoUrl || '/images/channel-placeholder.svg'; logo.alt = `${channel.name} logo`; logo.className = 'channel-logo'; logo.addEventListener('error', () => { logo.src = '/images/channel-placeholder.svg'; });
  const name = document.createElement('h3'); name.textContent = channel.name;
  const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.className = 'favorite-button'; removeButton.textContent = '★'; removeButton.setAttribute('aria-label', `Remove ${channel.name} from favorites`); removeButton.addEventListener('click', (event) => { event.stopPropagation(); removeFavorite(channel._id); });
  const header = document.createElement('div'); header.className = 'channel-card-header'; header.append(name, removeButton);
  const country = document.createElement('p'); country.className = 'channel-country'; country.textContent = channel.country || 'Country unavailable';
  const categories = document.createElement('p'); categories.className = 'channel-categories'; categories.textContent = channel.categories.join(', ') || 'Live TV';
  card.append(logo, header, country, categories); return card;
}

function renderFavorites() {
  const search = searchInput.value.trim().toLowerCase();
  const visibleFavorites = favorites.filter((favorite) => favorite.channelId && favorite.channelId.name.toLowerCase().includes(search));
  visibleFavorites.sort((first, second) => sortSelect.value === 'name'
    ? first.channelId.name.localeCompare(second.channelId.name)
    : new Date(second.createdAt) - new Date(first.createdAt));
  favoritesStatus.textContent = `${visibleFavorites.length} favorite${visibleFavorites.length === 1 ? '' : 's'}`;
  if (favorites.length === 0) { favoritesList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'You do not have favorite channels yet.' })); return; }
  if (visibleFavorites.length === 0) { favoritesList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'No channels found.' })); return; }
  favoritesList.replaceChildren(...visibleFavorites.map(createFavoriteCard));
}

async function loadFavorites() {
  const response = await fetch('/api/favorites');
  if (!response.ok) { favoritesStatus.textContent = 'Could not load favorites.'; return; }
  ({ favorites } = await response.json());
  renderFavorites();
}

async function removeFavorite(channelId) {
  const response = await fetch(`/api/favorites/${channelId}`, { method: 'DELETE' });
  if (response.ok) await loadFavorites();
  else favoritesStatus.textContent = 'Could not update favorites.';
}

searchInput.addEventListener('input', renderFavorites);
sortSelect.addEventListener('change', renderFavorites);
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) await loadFavorites(); }
start();
