const REQUIRED = [
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_MODE",
  "ALLOWED_ORIGINS",
  "EMAIL_HOST",
  "EMAIL_USER",
  "EMAIL_PASS",
  "SELLER_EMAIL",
];

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "[startup] Missing required env variables:",
      missing.join(", "),
    );
    process.exit(1); // hard stop — don't start a broken server
  }

  if (!["sandbox", "live"].includes(process.env.PAYPAL_MODE)) {
    console.error('[startup] PAYPAL_MODE must be "sandbox" or "live"');
    process.exit(1);
  }

  console.log(`[startup] env valid — mode: ${process.env.PAYPAL_MODE}`);
}
