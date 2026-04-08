import express from 'express';
import { createOrder, captureOrder }      from '../services/paypal.service.js';
import { validateOrderInput } from '../middleware/validateOrder.js';

const router = express.Router();

router.post('/', validateOrderInput, async (req, res) => {
  try {
    const { serviceId } = req.body;

    const order = await createOrder(serviceId);

    res.status(201).json({
      orderID: order.id
    });

  } catch (err) {
    console.error('[createOrder error]', err.message);
    res.status(500).json({
      error: 'Could not create order. Please try again.'
    });
  }
});

router.post('/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;

    // basic sanity check on the orderID format
    // PayPal orderIDs are alphanumeric, 17 chars
    if (!orderID || !/^[A-Z0-9]{17}$/.test(orderID)) {
      return res.status(400).json({ error: 'Invalid orderID format' });
    }

    const result = await captureOrder(orderID);

    // TODO Phase 5: this is where you'd save to DB and send email

    res.status(200).json({
      success: true,
      details: result
    });

  } catch (err) {
    console.error('[captureOrder error]', err.message);

    // distinguish between fraud/mismatch and generic errors
    if (err.message.includes('mismatch')) {
      return res.status(422).json({ error: err.message });
    }

    res.status(500).json({ error: 'Payment capture failed. Please contact support.' });
  }
});

export default router;