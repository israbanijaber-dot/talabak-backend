import { Router } from "express";
import { OrdersRepo, ProductsRepo, StoresRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("store_owner"));

const NEXT_STATUS = { PENDING: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY" };

router.get("/orders", asyncRoute(async (req, res) => {
  res.json({ orders: OrdersRepo.byStore(req.user.storeId) });
}));

router.patch("/orders/:id/status", asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order || order.storeId !== req.user.storeId) return res.status(404).json({ error: "الطلب غير موجود" });
  const { status } = req.body;
  const allowedNext = status === "CANCELLED" ? order.status === "PENDING" : NEXT_STATUS[order.status] === status;
  if (!allowedNext) return res.status(422).json({ error: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية" });
  res.json({ order: OrdersRepo.setStatus(order.id, status) });
}));

router.get("/products", asyncRoute(async (req, res) => {
  res.json({ products: ProductsRepo.byStore(req.user.storeId) });
}));

router.post("/products", asyncRoute(async (req, res) => {
  const product = ProductsRepo.create(req.user.storeId, req.body);
  res.status(201).json({ product });
}));

router.put("/products/:id", asyncRoute(async (req, res) => {
  const product = ProductsRepo.update(req.params.id, req.user.storeId, req.body);
  if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json({ product });
}));

router.delete("/products/:id", asyncRoute(async (req, res) => {
  const ok = ProductsRepo.remove(req.params.id, req.user.storeId);
  if (!ok) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json({ ok: true });
}));

router.patch("/settings", asyncRoute(async (req, res) => {
  const store = StoresRepo.update(req.user.storeId, req.body);
  res.json({ store });
}));

export default router;
