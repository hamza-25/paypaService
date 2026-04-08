import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import { paypalClient }  from '../config/paypal.js';

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
      description:  item.label,
      amount: {
        currency_code: currency,
        value: item.price       // price from our catalog, not from client
      }
    }]
  });

  const response = await paypalClient().execute(request);
  return response.result; // contains .id (the orderID)
}