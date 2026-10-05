import { readFile } from 'node:fs/promises';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Channel } from '../models/channel.model.js';
import { parseM3u } from '../utils/m3u-parser.js';

async function importPlaylist(): Promise<void> {
  const [filePath, country] = process.argv.slice(2);

  if (!filePath || !country) {
    throw new Error('Usage: npm run import:channels -- <playlist-file> <country>');
  }

  const playlist = await readFile(filePath, 'utf8');
  const channels = parseM3u(playlist, country);

  if (channels.length === 0) throw new Error('The playlist did not contain channels with name and stream URL');

  await connectDatabase();

  let created = 0;
  let updated = 0;

  for (const channel of channels) {
    const identity = channel.tvgId
      ? { country: channel.country, tvgId: channel.tvgId }
      : { country: channel.country, streamUrl: channel.streamUrl };
    const existingChannel = await Channel.findOne(identity);

    await Channel.findOneAndUpdate(identity, channel, { upsert: true, new: true, runValidators: true });
    if (existingChannel) updated += 1;
    else created += 1;
  }

  console.log(`${channels.length} channels from ${country.trim()} processed: ${created} created, ${updated} updated.`);
  await disconnectDatabase();
}

importPlaylist().catch(async (error: unknown) => {
  console.error('Could not import M3U playlist:', error);
  await disconnectDatabase();
  process.exit(1);
});
