'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * Central configuration. Everything tunable lives here and can be overridden
 * with environment variables (see .env.example). Both the API server and the
 * Discord bot import this, so they always agree on ports, office hours, etc.
 */

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

const config = {
  // ---- Network ----
  PORT: num('PORT', 3000),
  // Where the Discord bot reads the shared backend from. Defaults to the local
  // API server so the bot and dashboard read the exact same source of truth.
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${num('PORT', 3000)}`,

  // ---- Simulation ----
  SIM_INTERVAL_MS: num('SIM_INTERVAL_MS', 10000), // how often device states are re-evaluated

  // ---- Device power ratings (Watts when ON) ----
  FAN_WATTS: num('FAN_WATTS', 60),
  LIGHT_WATTS: num('LIGHT_WATTS', 15),

  // ---- Office hours (24h local clock) ----
  OFFICE_OPEN_HOUR: num('OFFICE_OPEN_HOUR', 9),  // 9 AM
  OFFICE_CLOSE_HOUR: num('OFFICE_CLOSE_HOUR', 17), // 5 PM

  // ---- Alert thresholds ----
  // A room is flagged if every device in it has been ON continuously for longer
  // than this. Lower it (e.g. 0.02 ~= 72s) to make the alert demoable quickly.
  ROOM_ON_HOURS_THRESHOLD: num('ROOM_ON_HOURS_THRESHOLD', 2),

  // Demo helpers: force "after office hours" so the after-hours alert is always
  // visible during a live demo regardless of the wall clock.
  FORCE_AFTER_HOURS: bool('FORCE_AFTER_HOURS', false),

  // ---- Discord ----
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  DISCORD_ALERT_CHANNEL_ID: process.env.DISCORD_ALERT_CHANNEL_ID || '',
  COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
  ALERT_POLL_MS: num('ALERT_POLL_MS', 30000), // how often the bot checks for new alerts to announce

  // ---- Optional LLM humanizer ----
  // If OPENAI_API_KEY is set the bot phrases replies conversationally; otherwise
  // it falls back to friendly hand-written templates so it always runs offline.
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

module.exports = config;
