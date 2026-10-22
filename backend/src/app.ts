import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import propertiesRoutes from "./routes/properties.routes";
import roomsRoutes from "./routes/rooms.routes";
import tenantsRoutes from "./routes/tenants.routes";
import leasesRoutes from "./routes/leases.routes";
import invoicesRoutes from "./routes/invoices.routes";
import paymentsRoutes from "./routes/payments.routes";
import electricityRoutes from "./routes/electricity.routes";
import complaintsRoutes from "./routes/complaints.routes";
import financeRoutes from "./routes/finance.routes";
import webhooksRoutes from "./routes/webhooks.routes";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import paymentMethodsRoutes from "./routes/payment-methods.routes";
import staffRoutes from "./routes/staff.routes";
import rolesRoutes from "./routes/roles.routes";
import leadsRoutes from "./routes/leads.routes";
import surveysRoutes from "./routes/surveys.routes";
import roomTypesRoutes from "./routes/room-types.routes";
import { requireAuth } from "./middleware/auth";

const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  process.env.DEPLOY_URL,
].filter((origin): origin is string => Boolean(origin)));

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (cURL, server-to-server, n8n webhook).
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "kost-erp-backend",
    database: "Supabase Connected",
  });
});

// Public endpoints (e.g. n8n / WhatsApp provider webhooks).
app.use("/api/webhooks", webhooksRoutes);

// Auth endpoint validates its own Supabase session.
app.use("/api/auth", authRoutes);

// Protected REST API.
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/properties", requireAuth, propertiesRoutes);
app.use("/api/room-types", requireAuth, roomTypesRoutes);
app.use("/api/rooms", requireAuth, roomsRoutes);
app.use("/api/tenants", requireAuth, tenantsRoutes);
app.use("/api/leases", requireAuth, leasesRoutes);
app.use("/api/invoices", requireAuth, invoicesRoutes);
app.use("/api/payments", requireAuth, paymentsRoutes);
app.use("/api/payment-methods", requireAuth, paymentMethodsRoutes);
app.use("/api/electricity", requireAuth, electricityRoutes);
app.use("/api/complaints", requireAuth, complaintsRoutes);
app.use("/api/finance", requireAuth, financeRoutes);
app.use("/api/staff", requireAuth, staffRoutes);
app.use("/api/roles", requireAuth, rolesRoutes);
app.use("/api/leads", requireAuth, leadsRoutes);
app.use("/api/surveys", requireAuth, surveysRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Backend Error:", err);
  const status = err.message === "Origin not allowed by CORS" ? 403 : (err.status || 500);
  res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

export default app;
