import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

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
import { requireAuth } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin header (cURL, server-to-server, n8n webhook, Supabase)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "kost-erp-backend",
    database: "Supabase Connected",
  });
});

// API Routes - Public
app.use("/api/webhooks", webhooksRoutes); // Dipanggil n8n / WA provider (tanpa user JWT)

// API Routes - Auth
app.use("/api/auth", authRoutes); // Menggunakan requireAuth di dalam router

app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/properties", requireAuth, propertiesRoutes);
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

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Backend Error:", err);
  const status = err.message === "Origin not allowed by CORS" ? 403 : (err.status || 500);
  res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Kost ERP Backend REST API running on port ${PORT}`);
  console.log(`📡 Connected to Supabase at ${process.env.SUPABASE_URL || "default url"}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
});
