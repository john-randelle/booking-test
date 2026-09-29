/**
 * Registers this API's appointment webhooks with Acuity.
 *
 *   pnpm acuity:webhooks https://<public-api-host>
 *
 * Existing webhooks (including other systems') are never modified or removed;
 * events already pointing at this target are skipped.
 */
import { createWebhook, listWebhooks } from "../lib/acuity/client.js";

const EVENTS = [
  "appointment.scheduled",
  "appointment.rescheduled",
  "appointment.canceled",
  "appointment.changed",
];

const host = process.argv[2];
if (!host || !/^https:\/\//.test(host)) {
  console.error("Usage: pnpm acuity:webhooks https://<public-api-host>");
  process.exit(1);
}

const target = `${host.replace(/\/+$/, "")}/api/webhooks/acuity`;
const existing = await listWebhooks();

for (const event of EVENTS) {
  if (existing.some((w) => w.event === event && w.target === target)) {
    console.log(`skip    ${event} (already registered)`);
    continue;
  }
  const created = await createWebhook(event, target);
  console.log(`created ${event} -> ${target} (id ${created.id})`);
}
