import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import { paypalClient }  from '../config/paypal.js';
import fetch from 'node-fetch';


// Single source of truth for prices — never comes from the client
const CATALOG = {
  backend:      { price: '300.00', label: 'Backend API Development' },
  frontend: { price: '80.00', label: 'Frontend Integration & Landing Pages' },
  auth:        { price: '180.00', label: 'Authentication & Security'  },
  database: { price: '120.00', label: 'Database Design & Optimization' },
  redis: { price: '100.00', label: 'Redis Caching & Performance' },
  deploy: { price: '150.00', label: 'Docker & Deployment' },
  consulting: { price: '30.00', label: 'Technical Consulting' }
};

export function getCatalogItem(serviceId) {
  const item = CATALOG[serviceId];
  if (!item) throw new Error(`Unknown serviceId: ${serviceId}`);
  return item;
}

export async function createOrder(serviceId, currency = 'USD') {
  const item = getCatalogItem(serviceId); // throws if invalid

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation'); // tells PayPal to return full order object

  request.requestBody({
    intent: 'CAPTURE', // means: I will capture (charge) this later
    purchase_units: [{
      reference_id: serviceId,  // we'll use this in capture to re-verify
      custom_id:    serviceId,
      description:  item.label,
      amount: {
        currency_code: currency,
        value: item.price       // price from our catalog, not from client
      }
    }]
  });

  const response = await paypalClient().execute(request);
  return response.result; 
}

export async function captureOrder(orderID) {

  // Step 1: tell PayPal to move the money
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  const response = await paypalClient().execute(request);
  const capture  = response.result;

  // Step 2: verify the status is actually COMPLETED
  // never assume — always check explicitly
  if (capture.status !== 'COMPLETED') {
    throw new Error(`Unexpected capture status: ${capture.status}`);
  }

  // Step 3: pull the captured amount and serviceId out of PayPal's response
  // these came FROM PayPal — not from the client
  const purchaseUnit   = capture.purchase_units[0];
  const capturedAmount = purchaseUnit.payments.captures[0].amount.value;
  const serviceId      = purchaseUnit.reference_id; // we set this in createOrder

  // Step 4: re-verify the amount against YOUR catalog
  // this is the check most tutorials skip
  const item = getCatalogItem(serviceId); // throws if serviceId is unknown

  if (capturedAmount !== item.price) {
    // This should never happen in normal flow
    // If it does, something serious is wrong — log it as a fraud alert
    console.error(`[FRAUD ALERT] Amount mismatch on order ${orderID}:`, {
      expected: item.price,
      captured: capturedAmount,
      serviceId
    });
    throw new Error('Payment amount mismatch. Please contact support.');
  }

  // Step 5: return clean data for the route handler
  return {
    orderId:   capture.id,
    status:    capture.status,
    serviceId,
    amount:    capturedAmount,
    currency:  purchaseUnit.payments.captures[0].amount.currency_code,
    captureId: purchaseUnit.payments.captures[0].id, // needed for refunds later
    email:     capture.payer?.email_address           // buyer's PayPal email
  };
}


export async function verifyWebhookSignature({
  headers,
  rawBody
}) {
  // Step 1: get a fresh access token from PayPal
  const base = process.env.PAYPAL_MODE === 'live'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com';

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const { access_token } = await tokenRes.json();

  // Step 2: send PayPal the signature headers + raw body for verification
  // PayPal checks all 5 headers together — if any one is missing, it fails
  const verifyRes = await fetch(
    `${base}/v1/notifications/verify-webhook-signature`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhook_id:    process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
        auth_algo:         headers['paypal-auth-algo'],
        cert_url:          headers['paypal-cert-url'],
        transmission_id:   headers['paypal-transmission-id'],
        transmission_sig:  headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time']
      })
    }
  );

  const { verification_status } = await verifyRes.json();
  return verification_status === 'SUCCESS';
}

export async function fetchOrder(orderID) {
  const request  = new checkoutNodeJssdk.orders.OrdersGetRequest(orderID);
  const response = await paypalClient().execute(request);
  return response.result;
}