const channelId = new URLSearchParams(location.search).get('channelId');
const video = document.querySelector('#video-player');
const playerStatus = document.querySelector('#player-status');
const retryButton = document.querySelector('#retry-player');
const favoriteButton = document.querySelector('#favorite-button');
const reportProblemLink = document.querySelector('#report-problem');
let channel;
let player;
let isFavorite = false;

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json(); document.querySelector('#welcome').textContent = `Welcome, ${user.email}`; return true;
}
function showPlayerState(state, message) {
  playerStatus.textContent = message; playerStatus.dataset.state = state;
  video.hidden = state !== 'playing'; retryButton.hidden = state !== 'error';
}
async function loadFavoriteState() {
  const response = await fetch('/api/favorites'); if (!response.ok) return;
  const { favorites } = await response.json(); isFavorite = favorites.some((favorite) => favorite.channelId && favorite.channelId._id === channel._id);
  favoriteButton.hidden = false; favoriteButton.textContent = isFavorite ? '★ Remove from Favorites' : '☆ Add to Favorites';
}
async function toggleFavorite() {
  const response = await fetch(`/api/favorites/${channel._id}`, { method: isFavorite ? 'DELETE' : 'POST' });
  if (!response.ok) return;
  isFavorite = !isFavorite; favoriteButton.textContent = isFavorite ? '★ Remove from Favorites' : '☆ Add to Favorites';
}
async function playChannel() {
  showPlayerState('loading', 'Preparing the live stream…');
  if (!window.shaka) { showPlayerState('error', 'The player could not load. Try again.'); return; }
  if (player) await player.destroy();
  player = new shaka.Player(video);
  player.addEventListener('error', () => showPlayerState('error', 'This live stream cannot be played right now.'));
  try {
    await player.load(channel.streamUrl);

    showPlayerState('playing', '');
    try { await video.play(); } catch { playerStatus.textContent = 'Press play to start audio.'; }
  } catch { showPlayerState('error', 'This live stream cannot be played right now.'); }
}
async function loadChannel() {
  if (!channelId) { showPlayerState('error', 'Choose a channel from Home.'); return; }

  const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}`);
  if (!response.ok) { showPlayerState('error', 'This channel is not available.'); return; }
  ({ channel } = await response.json());
  const logo = document.querySelector('#channel-logo'); logo.src = channel.logoUrl || '/images/channel-placeholder.svg'; logo.alt = `${channel.name} logo`; logo.addEventListener('error', () => { logo.src = '/images/channel-placeholder.svg'; });

  document.querySelector('#channel-name').textContent = channel.name;
  document.querySelector('#channel-country').textContent = channel.country;
  document.querySelector('#channel-categories').textContent = channel.categories.join(', ') || 'Live TV';
  await loadFavoriteState(); await playChannel();
}
favoriteButton.addEventListener('click', toggleFavorite); retryButton.addEventListener('click', playChannel);
if (channelId) reportProblemLink.href = `/reports.html?${new URLSearchParams({ channelId })}`;
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) await loadChannel(); } start();
