import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

export function applySecurityMiddleware(app) {
  // 1. HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://www.paypal.com",
            "https://www.paypalobjects.com",
          ],
          frameSrc: ["'self'", "https://www.paypal.com"],
          connectSrc: [
            "'self'",
            "https://www.paypal.com",
            "https://api.paypal.com",
            "https://api.sandbox.paypal.com",
          ],
        },
      },
    }),
  );

  // 2. CORS — only your frontend domains
  const allowed = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin && process.env.PAYPAL_MODE === "sandbox")
          return cb(null, true);
        if (allowed.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
      },
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    }),
  );

  // 3. General rate limiter — all routes
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests" },
    }),
  );
}

// Strict limiter just for payment endpoints
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many payment requests. Try again in 15 minutes." },
});
