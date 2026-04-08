import 'dotenv/config';
import express      from 'express';
import helmet       from 'helmet';
import cors         from 'cors';
import ordersRouter from './routes/orders.js';
import { paymentLimiter } from './middleware/rateLimiter.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// Allowed origins — your Vercel domain (and localhost for dev)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',    
  'http://localhost:8080',    
  'https://hamzaichaoui.dev'    
];

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) only in dev
    if (!origin && process.env.PAYPAL_MODE === 'sandbox') {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));
app.use('/api/orders', paymentLimiter, ordersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.PAYPAL_MODE} mode`);
});

export default app;