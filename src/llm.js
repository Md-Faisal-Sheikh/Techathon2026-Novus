'use strict';

const config = require('./config');

/**
 * llm.js — turns raw office data into a warm, human reply.
 *
 * If OPENAI_API_KEY is configured, we ask a small model to phrase the facts
 * conversationally. If not, we fall back to friendly templates so the bot works
 * completely offline. Either way the *facts* come from the shared backend — the
 * model only rewords data we already computed, it never invents device states.
 */

async function humanize(kind, data) {
  if (config.OPENAI_API_KEY) {
    try {
      return await viaLLM(kind, data);
    } catch (err) {
      console.warn('[llm] falling back to templates:', err.message);
    }
  }
  return template(kind, data);
}

async function viaLLM(kind, data) {
  const system =
    'You are the friendly facilities assistant for a small office. Rephrase the ' +
    'given JSON facts as one short, warm, human message (1-3 sentences). Never ' +
    'invent numbers or device states — only use what is in the data. No markdown ' +
    'tables, no bullet dumps. Keep it light; the boss hates robotic data dumps.';

  const res = await fetch(`${config.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 160,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `kind=${kind}\ndata=${JSON.stringify(data)}` },
      ],
    }),
  });

  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('empty LLM response');
  return text;
}

// ---- Offline templates ------------------------------------------------------

function template(kind, data) {
  switch (kind) {
    case 'status':
      return statusTemplate(data);
    case 'room':
      return roomTemplate(data);
    case 'usage':
      return usageTemplate(data);
    case 'alert':
      return alertTemplate(data);
    default:
      return 'Here you go.';
  }
}

function statusTemplate({ rooms }) {
  const parts = rooms.map((r) => {
    const on = r.fansOn + r.lightsOn;
    if (on === 0) return `${r.name}: all quiet`;
    return `${r.name}: ${r.fansOn} fan(s) & ${r.lightsOn} light(s) on`;
  });
  return `Here's the office right now — ${parts.join('; ')}. ⚡`;
}

function roomTemplate(r) {
  const on = r.fansOn + r.lightsOn;
  if (on === 0) return `${r.name} is all switched off — nothing drawing power there. 👍`;
  return (
    `In ${r.name}: ${r.fansOn} of 2 fans and ${r.lightsOn} of 3 lights are on, ` +
    `pulling about ${r.power}W right now.`
  );
}

function usageTemplate(p) {
  return (
    `Right now the office is drawing ${p.totalWatts}W. ` +
    `So far today that's roughly ${p.todayKwh} kWh. ` +
    (p.totalWatts > 300 ? 'Bit heavy — worth a glance. ⚡' : 'Nice and easy. 🌿')
  );
}

function alertTemplate(a) {
  const emoji = a.severity === 'critical' ? '🚨' : '⚠️';
  return `${emoji} Hey! ${a.message} Did someone forget to switch off before leaving?`;
}

module.exports = { humanize, template };
