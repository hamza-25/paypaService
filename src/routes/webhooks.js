// import express from "express";
// import {
//   verifyWebhookSignature,
//   fetchOrder,
// } from "../services/paypal.service.js";
// import { fulfillOrder } from "../services/fulfillment.js";
// import {
//   isAlreadyProcessed,
//   markAsProcessed,
// } from "../services/idempotency.js";

// const router = express.Router();

// const IS_SANDBOX = process.env.PAYPAL_MODE === "sandbox";

// router.post(
//   "/paypal",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     res.status(200).json({ received: true });

//     try {
//       const rawBody = req.body.toString();
//       const event = JSON.parse(rawBody);

//       // detect simulator events — they have a specific summary field
//       const isSimulatorEvent =
//         event.summary?.includes("Example") ||
//         event.resource?.id === "EXAMPLEID" ||
//         !req.headers["paypal-transmission-id"];

//       // in sandbox + simulator: skip sig verification (known PayPal limitation)
//       // in sandbox + real payment: verify normally
//       // in production: ALWAYS verify, no exceptions
//       if (!IS_SANDBOX || !isSimulatorEvent) {
//         const isValid = await verifyWebhookSignature({
//           headers: req.headers,
//           rawBody,
//         });

//         if (!isValid) {
//           console.warn("[webhook] invalid signature — request rejected");
//           return;
//         }
//       } else {
//         console.log(
//           "[webhook] simulator event detected — skipping sig check (sandbox only)",
//         );
//       }

//       const eventId = event.id;

//       if (isAlreadyProcessed(eventId)) {
//         console.log(`[webhook] duplicate event ${eventId} — skipping`);
//         return;
//       }

//       markAsProcessed(eventId);

//       // console.log(`[webhook] received event: ${event.event_type}`);

//       if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
//         const resource = event.resource;
//         const captureId = resource.id;
//         const amount = resource.amount?.value || "0.00";

//         // get the order_id from the capture resource
//         const orderID = resource.supplementary_data?.related_ids?.order_id;

//         let serviceId = "unknown";
//         let email = "unknown";

//         if (orderID) {
//           try {
//             // fetch the full order — this has custom_id, buyer email, purchase_units
//             const order = await fetchOrder(orderID);

//             // custom_id is what you set in createOrder — most reliable serviceId source
//             serviceId =
//               order.purchase_units?.[0]?.custom_id ||
//               order.purchase_units?.[0]?.reference_id ||
//               "unknown";

//             // buyer email lives on the order, not the capture resource
//             email = order.payer?.email_address || "not-available";
//           } catch (err) {
//             console.error("[webhook] could not fetch order:", err.message);
//           }
//         }

//         // console.log("[webhook] extracted:", {
//         //   captureId,
//         //   orderID,
//         //   amount,
//         //   serviceId,
//         //   email,
//         // });

//         await fulfillOrder({ captureId, serviceId, amount, email });
//       }

//       if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
//         console.warn(`[webhook] capture denied for ${event.resource?.id}`);
//       }
//     } catch (err) {
//       console.error("[webhook] processing error:", err.message);
//     }
//   },
// );

// export default router;

import express from "express";
import {
  verifyWebhookSignature,
  fetchOrder,
} from "../services/paypal.service.js";
import { fulfillOrder } from "../services/fulfillment.js";
import {
  recordWebhookEvent,
  markOrderFulfilledByCapture,
} from "../db/orderRepository.js";

const router = express.Router();
const IS_SANDBOX = process.env.PAYPAL_MODE === "sandbox";

router.post(
  "/paypal",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    res.status(200).json({ received: true });

    try {
      const rawBody = req.body.toString();
      const event = JSON.parse(rawBody);

      const isSimulatorEvent =
        event.summary?.includes("Example") ||
        event.resource?.id === "EXAMPLEID" ||
        !req.headers["paypal-transmission-id"];

      if (!IS_SANDBOX || !isSimulatorEvent) {
        const isValid = await verifyWebhookSignature({
          headers: req.headers,
          rawBody,
        });
        if (!isValid) {
          console.warn("[webhook] invalid signature — rejected");
          return;
        }
      } else {
        console.log("[webhook] simulator event — skipping sig check");
      }

      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const resource = event.resource;
        const captureId = resource.id;
        const amount = resource.amount?.value || "0.00";
        const orderID = resource.supplementary_data?.related_ids?.order_id;

        // idempotency via DB — returns false if already processed
        const isNew = recordWebhookEvent({
          eventId: event.id,
          eventType: event.event_type,
          orderId: orderID || null,
          captureId,
          rawPayload: rawBody,
        });

        if (!isNew) {
          console.log(`[webhook] duplicate event ${event.id} — skipped`);
          return;
        }

        // fetch full order to get serviceId and buyer email
        let serviceId = "unknown";
        let email = "unknown";

        if (orderID) {
          try {
            const order = await fetchOrder(orderID);
            serviceId =
              order.purchase_units?.[0]?.custom_id ||
              order.purchase_units?.[0]?.reference_id ||
              "unknown";
            email = order.payer?.email_address || "not-available";
          } catch (err) {
            console.error("[webhook] fetchOrder failed:", err.message);
          }
        }

        // update DB: mark order fulfilled
        markOrderFulfilledByCapture({ captureId, buyerEmail: email });

        // fulfill (email, unlock access, etc.)
        await fulfillOrder({ captureId, serviceId, amount, email });

        console.log("[webhook] fulfilled and saved:", {
          captureId,
          serviceId,
          amount,
          email,
        });
      }

      if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
        const captureId = event.resource?.id;
        console.warn("[webhook] capture denied:", captureId);

        recordWebhookEvent({
          eventId: event.id,
          eventType: event.event_type,
          captureId: captureId || null,
          orderId: null,
          rawPayload: rawBody,
        });
      }
    } catch (err) {
      console.error("[webhook] processing error:", err.message);
    }
  },
);

export default router;
