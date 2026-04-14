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
