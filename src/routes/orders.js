import express              from 'express';
import { createOrder }      from '../services/paypal.service.js';
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

export default router;