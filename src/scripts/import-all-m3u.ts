import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Channel } from '../models/channel.model.js';
import { Favorite } from '../models/favorite.model.js';
import { parseM3u } from '../utils/m3u-parser.js';

const countriesByPlaylist: Record<string, string> = {
  argentina: 'Argentina',
  canada: 'Canada',
  japon: 'Japan',
  mexico: 'Mexico',
  usa: 'United States'
};

async function importAllPlaylists(): Promise<void> {
  const playlistDirectory = path.join(process.cwd(), 'docs');
  const playlistFiles = (await readdir(playlistDirectory))
    .filter((file) => file.endsWith('_playlist.m3u'))
    .sort();

  if (playlistFiles.length === 0) throw new Error('No M3U playlists were found in docs');

  await connectDatabase();
  await Favorite.deleteMany({});
  await Channel.deleteMany({});

  let imported = 0;
  for (const file of playlistFiles) {
    const key = file.replace('_playlist.m3u', '');
    const country = countriesByPlaylist[key];
    if (!country) throw new Error('Country is missing for ' + file);

    const playlist = await readFile(path.join(playlistDirectory, file), 'utf8');
    const channels = parseM3u(playlist, country);
    await Channel.insertMany(channels);
    imported += channels.length;
    console.log(file + ': ' + channels.length + ' channels imported for ' + country + '.');
  }

  console.log(imported + ' channels imported from ' + playlistFiles.length + ' playlists. Favorites were cleared.');
  await disconnectDatabase();
}

importAllPlaylists().catch(async (error: unknown) => {
  console.error('Could not import M3U playlists:', error);
  await disconnectDatabase();
  process.exit(1);
});
