import { sendBuyerConfirmation, sendSellerNotification } from "./mailer.js";
import { sendToN8n } from "./sendToN8N.js";

export async function fulfillOrder({ captureId, serviceId, amount, email }) {
  console.log("[fulfillment] starting:", {
    captureId,
    serviceId,
    amount,
    email,
  });

  // send data to n8n for mail
  sendToN8n({ captureId, serviceId, amount, email })
    .then(() => console.log("[n8n] data sent successfully"))
    .catch((err) => console.error("[n8n] failed to send data:", err.message));
}
