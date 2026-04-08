import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import 'dotenv/config';

function buildEnvironment() {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env');
  }

  return process.env.PAYPAL_MODE === 'live'
    ? new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

// A fresh client per request — avoids stale token issues
export function paypalClient() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(buildEnvironment());
}