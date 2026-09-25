import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import storesRoutes from "./routes/stores.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import storeRoutes from "./routes/store.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "talabak-backend" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/stores", storesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/store", storeRoutes);   // لوحة صاحب المحل
  app.use("/api/driver", driverRoutes); // تطبيق المندوب
  app.use("/api/admin", adminRoutes);   // لوحة الإدارة

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
