import "dotenv/config";
import express from "express";
import { validateEnv } from "./config/env.js";
import {
  applySecurityMiddleware,
  paymentLimiter,
} from "./middleware/security.js";
import ordersRouter from "./routes/orders.js";
import webhooksRouter from "./routes/webhooks.js";

// validate env before anything else
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// security middleware
applySecurityMiddleware(app);

// webhooks BEFORE express.json() — needs raw body
app.use("/webhooks", webhooksRouter);

// JSON parser for all other routes
app.use(express.json({ limit: "10kb" }));

// routes
app.use("/api/orders", paymentLimiter, ordersRouter);

// health check — Render uses this to confirm the server is up
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.PAYPAL_MODE,
    time: new Date().toISOString(),
  });
});

// global error handler
app.use((err, req, res, next) => {
  console.error("[unhandled]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(
    `[server] running on port ${PORT} — ${process.env.PAYPAL_MODE} mode`,
  );
});

export default app;
