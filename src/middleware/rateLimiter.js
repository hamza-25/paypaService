import rateLimit from 'express-rate-limit';

export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,                   // max 20 requests per IP per window
  standardHeaders: true,     // sends RateLimit headers in response
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again in 15 minutes'
  }
});