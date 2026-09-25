import { Router } from "express";
import db from "../db/index.js";
import { OrdersRepo, StoresRepo, DriversRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/stats", asyncRoute(async (req, res) => {
  const orders = OrdersRepo.all();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const today = orders.filter((o) => o.createdAt >= startOfDay.getTime());
  const completed = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const active = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));
  const revenue = completed.reduce((s, o) => s + o.total, 0);
  const cashCollected = orders.filter((o) => o.paymentStatus === "COLLECTED").reduce((s, o) => s + o.total, 0);
  const usersCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get().c;

  res.json({
    totalOrders: orders.length, ordersToday: today.length, totalUsers: usersCount,
    totalStores: StoresRepo.list().length, totalDrivers: DriversRepo.list().length,
    activeOrders: active.length, completedOrders: completed.length, cancelledOrders: cancelled.length,
    revenue, cashCollected,
  });
}));

router.get("/orders", asyncRoute(async (req, res) => {
  res.json({ orders: OrdersRepo.all(req.query.status) });
}));

router.get("/stores", asyncRoute(async (req, res) => {
  res.json({ stores: StoresRepo.list() });
}));

router.patch("/stores/:id", asyncRoute(async (req, res) => {
  res.json({ store: StoresRepo.update(req.params.id, req.body) });
}));

router.get("/drivers", asyncRoute(async (req, res) => {
  res.json({ drivers: DriversRepo.list() });
}));

router.patch("/drivers/:id", asyncRoute(async (req, res) => {
  res.json({ driver: DriversRepo.setActive(req.params.id, !!req.body.isActive) });
}));

export default router;
