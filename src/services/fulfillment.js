// src/services/fulfillment.js
// export async function fulfillOrder({ captureId, serviceId, amount, email }) {

//   // This is where your real business logic goes:
//   // 1. update your database order record to status: 'paid'
//   // 2. send a confirmation email to the buyer
//   // 3. unlock access to whatever they bought

//   // For now: log it clearly
//   console.log('[fulfillment] order fulfilled:', {
//     captureId,
//     serviceId,
//     amount,
//     email,
//     fulfilledAt: new Date().toISOString()
//   });

//   // TODO: replace with real implementation
//   // await db.orders.updateOne({ captureId }, { status: 'paid' });
//   // await emailService.sendConfirmation({ to: email, serviceId });
// }
import { sendBuyerConfirmation, sendSellerNotification } from "./mailer.js";

export async function fulfillOrder({ captureId, serviceId, amount, email }) {
  console.log("[fulfillment] starting:", {
    captureId,
    serviceId,
    amount,
    email,
  });

  // send both emails in parallel — don't wait for one before the other
  await Promise.allSettled([
    // buyer confirmation — only if we have a real email
    email && email !== "not-available"
      ? sendBuyerConfirmation({
          to: email,
          serviceId,
          amount,
          captureId,
        })
          .then(() => console.log("[mailer] buyer email sent to:", email))
          .catch((err) =>
            console.error("[mailer] buyer email failed:", err.message),
          )
      : Promise.resolve(),

    // seller notification — always
    sendSellerNotification({
      buyerEmail: email || "unknown",
      serviceId,
      amount,
      captureId,
    })
      .then(() => console.log("[mailer] seller email sent"))
      .catch((err) =>
        console.error("[mailer] seller email failed:", err.message),
      ),
  ]);

  console.log("[fulfillment] done:", captureId);
}
