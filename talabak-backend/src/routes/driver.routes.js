import { Router } from "express";
import { OrdersRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("driver"));

const NEXT_STATUS = { ASSIGNED: "PICKED_UP", PICKED_UP: "ON_THE_WAY", ON_THE_WAY: "DELIVERED" };

router.get("/available", asyncRoute(async (req, res) => {
  res.json({ orders: OrdersRepo.available() });
}));

router.get("/orders", asyncRoute(async (req, res) => {
  res.json({ orders: OrdersRepo.byDriver(req.user.driverId) });
}));

router.post("/orders/:id/accept", asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order || order.status !== "READY" || order.driverId) return res.status(422).json({ error: "هذا الطلب لم يعد متاحًا" });
  res.json({ order: OrdersRepo.assignDriver(order.id, req.user.driverId) });
}));

router.patch("/orders/:id/status", asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order || order.driverId !== req.user.driverId) return res.status(404).json({ error: "الطلب غير موجود" });
  const { status } = req.body;
  if (NEXT_STATUS[order.status] !== status) return res.status(422).json({ error: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية" });
  res.json({ order: OrdersRepo.setStatus(order.id, status) });
}));

router.post("/orders/:id/collect-cash", asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order || order.driverId !== req.user.driverId) return res.status(404).json({ error: "الطلب غير موجود" });
  if (order.status !== "DELIVERED") return res.status(422).json({ error: "لا يمكن تحصيل المبلغ قبل تسليم الطلب" });
  res.json({ order: OrdersRepo.setPaymentCollected(order.id) });
}));

export default router;
