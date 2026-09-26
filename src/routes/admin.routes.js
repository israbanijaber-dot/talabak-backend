import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { OrdersRepo, StoresRepo, DriversRepo, UsersRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isValidPhone } from "../utils/phone.js";

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

router.post("/stores", asyncRoute(async (req, res) => {
  const { name, category, phone, address, deliveryFee, minOrder, deliveryTime, cover, description, ownerName, ownerEmail, ownerPassword } = req.body;
  if (!name || !category) return res.status(400).json({ error: "اسم المحل وتصنيفه مطلوبان" });
  if (ownerEmail && UsersRepo.byEmail(ownerEmail)) return res.status(409).json({ error: "البريد الإلكتروني لصاحب المحل مستخدم بالفعل" });
  if (ownerPassword && ownerPassword.length < 6) return res.status(400).json({ error: "كلمة مرور صاحب المحل يجب أن تكون 6 أحرف على الأقل" });

  const store = StoresRepo.create({ name, category, phone, address, deliveryFee, minOrder, deliveryTime, cover, description });
  let owner = null;
  if (ownerEmail && ownerPassword) {
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    owner = UsersRepo.createStoreOwner({ name: ownerName || name, phone, email: ownerEmail, passwordHash, storeId: store.id });
  }
  res.status(201).json({ store, owner: owner ? UsersRepo.toPublic(owner) : null });
}));

router.patch("/stores/:id", asyncRoute(async (req, res) => {
  res.json({ store: StoresRepo.update(req.params.id, req.body) });
}));

router.delete("/stores/:id", asyncRoute(async (req, res) => {
  if (StoresRepo.hasOrders(req.params.id)) {
    return res.status(422).json({ error: "لا يمكن حذف محل له طلبات سابقة — أغلقه بدل ذلك (زر التفعيل) للحفاظ على سجل الطلبات" });
  }
  StoresRepo.remove(req.params.id);
  res.json({ ok: true });
}));

router.get("/drivers", asyncRoute(async (req, res) => {
  res.json({ drivers: DriversRepo.list() });
}));

router.post("/drivers", asyncRoute(async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name) return res.status(400).json({ error: "اسم المندوب مطلوب" });
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: "رقم هاتف المندوب غير صحيح" });
  if (email && UsersRepo.byEmail(email)) return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
  if (email && password && password.length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });

  const driver = DriversRepo.create({ name, phone });
  let account = null;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    account = UsersRepo.createDriverAccount({ name, phone, email, passwordHash, driverId: driver.id });
  }
  res.status(201).json({ driver, account: account ? UsersRepo.toPublic(account) : null });
}));

router.patch("/drivers/:id", asyncRoute(async (req, res) => {
  res.json({ driver: DriversRepo.setActive(req.params.id, !!req.body.isActive) });
}));

router.get("/users", asyncRoute(async (req, res) => {
  res.json({ users: UsersRepo.listCustomers() });
}));

router.patch("/users/:id", asyncRoute(async (req, res) => {
  res.json({ user: UsersRepo.setActive(req.params.id, !!req.body.isActive) });
}));

export default router;

