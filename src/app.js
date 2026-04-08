// import 'dotenv/config';
// import express from 'express';

// const app  = express();
// const PORT = process.env.PORT || 3000;

// app.get('/health', (req, res) => res.json({ status: 'ok' }));

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// export default app;
import 'dotenv/config';
import express      from 'express';
import helmet       from 'helmet';
import ordersRouter from './routes/orders.js';
import { paymentLimiter } from './middleware/rateLimiter.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// Security headers — always first
app.use(helmet());

// Webhooks need raw body, so that route is registered BEFORE express.json()
// (we'll add it in Phase 5 — placeholder comment for now)

// JSON body parser for all other routes
app.use(express.json({ limit: '10kb' })); // 10kb limit prevents large payload attacks

// Routes
app.use('/api/orders', paymentLimiter, ordersRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler — catches anything that falls through
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.PAYPAL_MODE} mode`);
});

export default app;