import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// verify connection on startup
transporter.verify((err) => {
  if (err) console.error("[mailer] connection failed:", err.message);
  else console.log("[mailer] ready");
});

export async function sendBuyerConfirmation({
  to,
  serviceId,
  amount,
  captureId,
}) {
  await transporter.sendMail({
    from: `"Hamza Ichaoui" <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Payment confirmed — thank you!",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
        <h2 style="margin:0 0 8px;font-size:22px">Payment received</h2>
        <p style="color:#555;margin:0 0 24px">
          Thank you for your purchase. Here are your order details:
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">
              ${serviceId}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Amount paid</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">
              $${amount} USD
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Order reference</td>
            <td style="padding:10px 0;font-family:monospace;font-size:12px;text-align:right;color:#555">
              ${captureId}
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 8px;color:#555;font-size:14px">
          I will reach out within <strong>24 hours</strong> to get started.
          If you have any questions, reply to this email.
        </p>

        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;
          font-size:12px;color:#aaa">
          Hamza Ichaoui · hamzaichaoui.dev
        </div>
      </div>
    `,
  });
}

export async function sendSellerNotification({
  buyerEmail,
  serviceId,
  amount,
  captureId,
}) {
  await transporter.sendMail({
    from: `"Payment System" <${process.env.EMAIL_FROM}>`,
    to: process.env.SELLER_EMAIL,
    subject: `New payment — ${serviceId} $${amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
        <h2 style="margin:0 0 8px;font-size:22px">New payment received</h2>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Buyer</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">
              ${buyerEmail}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">
              ${serviceId}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Amount</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;
              text-align:right;color:#16a34a">
              $${amount} USD
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Capture ID</td>
            <td style="padding:10px 0;font-family:monospace;font-size:12px;
              text-align:right;color:#555">
              ${captureId}
            </td>
          </tr>
        </table>

        <p style="margin-top:24px;font-size:13px;color:#888">
          Log into PayPal dashboard to view full transaction details.
        </p>
      </div>
    `,
  });
}
