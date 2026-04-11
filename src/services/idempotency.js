// src/services/idempotency.js
const processedEvents = new Set();

export function isAlreadyProcessed(eventId) {
  return processedEvents.has(eventId);
}

export function markAsProcessed(eventId) {
  processedEvents.add(eventId);
}