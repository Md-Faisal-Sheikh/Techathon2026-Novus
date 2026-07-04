'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const { humanize } = require('./llm');

/**
 * bot.js — the Discord quick-access remote.
 *
 * It never holds device state itself. Every command fetches from the shared
 * backend's REST API, so the bot and the web dashboard are always in sync.
 * Replies are run through the LLM humanizer (or friendly templates offline).
 *
 * Bonus: it polls /api/alerts and proactively posts new alerts to a channel.
 */

const P = config.COMMAND_PREFIX;

async function api(pathname) {
  const res = await fetch(`${config.API_BASE_URL}${pathname}`);
  if (!res.ok) throw new Error(`backend ${pathname} -> HTTP ${res.status}`);
  return res.json();
}

// ---- command handlers (pure-ish: fetch data, humanize, return text) ---------

const commands = {
  async status() {
    const state = await api('/api/state');
    return humanize('status', { rooms: state.rooms });
  },

  async room(arg) {
    if (!arg) return `Which room? Try \`${P}room work1\`, \`${P}room work2\`, or \`${P}room drawing\`.`;
    const res = await fetch(`${config.API_BASE_URL}/api/rooms/${encodeURIComponent(arg)}`);
    if (res.status === 404) return `I don't know a room called "${arg}". Try work1, work2, or drawing.`;
    if (!res.ok) throw new Error(`rooms HTTP ${res.status}`);
    return humanize('room', await res.json());
  },

  async usage() {
    const power = await api('/api/power');
    return humanize('usage', power);
  },

  async alerts() {
    const { alerts } = await api('/api/alerts');
    if (!alerts.length) return 'All clear — no active alerts right now. ✅';
    const lines = await Promise.all(alerts.map((a) => humanize('alert', a)));
    return lines.join('\n');
  },

  help() {
    return [
      '**Office Power Monitor — commands**',
      `\`${P}status\` — quick on/off summary for every room`,
      `\`${P}room <name>\` — one room in detail (work1 / work2 / drawing)`,
      `\`${P}usage\` — cost right now (৳/hour) + today's bill so far`,
      `\`${P}alerts\` — anything anomalous right now`,
    ].join('\n');
  },
};

async function handleMessage(message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(P)) return;

  const [raw, ...rest] = message.content.slice(P.length).trim().split(/\s+/);
  const cmd = (raw || '').toLowerCase();
  const arg = rest.join(' ');

  const handler = commands[cmd];
  if (!handler) return; // ignore unknown commands quietly

  try {
    if (message.channel.sendTyping) await message.channel.sendTyping();
    const reply = await handler(arg);
    await message.reply(reply);
  } catch (err) {
    console.error(`[bot] ${cmd} failed:`, err.message);
    await message.reply('Hmm, I couldn’t reach the office backend just now. Try again in a sec.');
  }
}

// ---- proactive alerts -------------------------------------------------------

const announced = new Map(); // alert id -> last message timestamp (dedupe)

async function pollAlerts(client) {
  if (!config.DISCORD_ALERT_CHANNEL_ID) return;
  try {
    const { alerts } = await api('/api/alerts');
    const channel = await client.channels.fetch(config.DISCORD_ALERT_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.send) return;

    for (const a of alerts) {
      const last = announced.get(a.id) || 0;
      // Re-announce a persisting alert at most once every 30 minutes.
      if (Date.now() - last < 30 * 60 * 1000) continue;
      announced.set(a.id, Date.now());
      const text = await humanize('alert', a);
      await channel.send(text);
    }
    // Forget alerts that have cleared so they re-announce if they return.
    const live = new Set(alerts.map((a) => a.id));
    for (const id of announced.keys()) if (!live.has(id)) announced.delete(id);
  } catch (err) {
    console.warn('[bot] alert poll failed:', err.message);
  }
}

// ---- boot -------------------------------------------------------------------

function start() {
  if (!config.DISCORD_TOKEN) {
    console.error('[bot] DISCORD_TOKEN is not set. Add it to .env — see README.');
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once('ready', () => {
    console.log(`[bot] logged in as ${client.user.tag}`);
    console.log(`[bot] reading backend at ${config.API_BASE_URL}`);
    if (config.DISCORD_ALERT_CHANNEL_ID) {
      setInterval(() => pollAlerts(client), config.ALERT_POLL_MS);
    }
  });

  client.on('messageCreate', handleMessage);
  client.login(config.DISCORD_TOKEN);
  return client;
}

if (require.main === module) start();

module.exports = { start, commands, handleMessage, pollAlerts };
