import db from "./database.js";

// called from the capture route (Phase 4) — creates the order record
export function createOrder({ orderId, serviceId, amount, currency = "USD" }) {
  const stmt = db.prepare(`
    INSERT INTO orders (order_id, service_id, amount, currency, status)
    VALUES (@orderId, @serviceId, @amount, @currency, 'pending')
    ON CONFLICT(order_id) DO NOTHING
  `);
  return stmt.run({ orderId, serviceId, amount, currency });
}

// called after capture succeeds — marks order as paid
export function markOrderPaid({ orderId, captureId, buyerEmail }) {
  const stmt = db.prepare(`
    UPDATE orders
    SET status       = 'paid',
        capture_id   = @captureId,
        buyer_email  = @buyerEmail,
        fulfilled_at = datetime('now')
    WHERE order_id = @orderId
  `);
  return stmt.run({ orderId, captureId, buyerEmail });
}

// called from webhook — upsert approach
// returns true if this is a new event, false if already processed
export function recordWebhookEvent({
  eventId,
  eventType,
  orderId,
  captureId,
  rawPayload,
}) {
  const stmt = db.prepare(`
    INSERT INTO webhook_events (event_id, event_type, order_id, capture_id, raw_payload)
    VALUES (@eventId, @eventType, @orderId, @captureId, @rawPayload)
    ON CONFLICT(event_id) DO NOTHING
  `);

  const result = stmt.run({
    eventId,
    eventType,
    orderId,
    captureId,
    rawPayload,
  });

  // changes === 0 means the event_id already existed — duplicate
  return result.changes > 0;
}

// called from webhook to fulfill
export function markOrderFulfilledByCapture({ captureId, buyerEmail }) {
  const stmt = db.prepare(`
    UPDATE orders
    SET status       = 'fulfilled',
        buyer_email  = COALESCE(buyer_email, @buyerEmail),
        fulfilled_at = COALESCE(fulfilled_at, datetime('now'))
    WHERE capture_id = @captureId
      AND status != 'fulfilled'
  `);
  return stmt.run({ captureId, buyerEmail });
}

// useful for querying and admin
export function getOrderById(orderId) {
  return db.prepare("SELECT * FROM orders WHERE order_id = ?").get(orderId);
}

export function getOrderByCaptureId(captureId) {
  return db.prepare("SELECT * FROM orders WHERE capture_id = ?").get(captureId);
}

export function getAllOrders() {
  return db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
}
