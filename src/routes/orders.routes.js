import { Router } from "express";
import { OrdersRepo, StoresRepo, ProductsRepo, UsersRepo, ReviewsRepo, DriversRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isValidPhone } from "../utils/phone.js";

const router = Router();

const AREAS = ["حي الوسط", "حي الشرق", "حي الغرب", "حي الشمال", "حي الجنوب"]; // "خارج عقربا" غير مسموح

router.post("/", requireAuth, requireRole("customer"), asyncRoute(async (req, res) => {
  const { storeId, items, address, phone, orderNotes } = req.body;
  if (!storeId || !Array.isArray(items) || items.length === 0 || !address || !phone) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "رقم الهاتف غير صحيح — استخدم صيغة فلسطينية أو إسرائيلية مثل 0599123456" });
  }
  if (!AREAS.includes(address.area)) {
    return res.status(422).json({ error: "عذرًا، طلبك خارج نطاق التوصيل في عقربا." });
  }
  const store = StoresRepo.get(storeId);
  if (!store) return res.status(404).json({ error: "المحل غير موجود" });
  if (!store.isOpen) return res.status(422).json({ error: "المحل مغلق حاليًا ولا يستقبل طلبات جديدة" });

  // نتحقق من كل منتج ونعيد بناء السعر من قاعدة البيانات (لا نثق بسعر الواجهة الأمامية)
  const verifiedItems = [];
  for (const it of items) {
    const product = ProductsRepo.get(it.productId);
    if (!product || product.storeId !== storeId || !product.available) {
      return res.status(422).json({ error: `المنتج "${it.name || it.productId}" غير متاح حاليًا` });
    }
    const optionsPrice = (it.options || []).reduce((s, o) => s + (Number(o.price) || 0), 0);
    verifiedItems.push({ productId: product.id, name: product.name, price: product.price + optionsPrice, quantity: Math.max(1, Number(it.quantity) || 1), options: it.options || [], notes: it.notes || "" });
  }
  const subtotal = verifiedItems.reduce((s, it) => s + it.quantity * it.price, 0);
  if (subtotal < store.minOrder) {
    return res.status(422).json({ error: `الحد الأدنى للطلب من هذا المحل هو ${store.minOrder} ₪` });
  }

  const customer = UsersRepo.byId(req.user.id);
  const order = OrdersRepo.create({ customer, store, items: verifiedItems, address, phone, orderNotes });
  res.status(201).json({ order });
}));

router.get("/mine", requireAuth, requireRole("customer"), asyncRoute(async (req, res) => {
  const orders = OrdersRepo.byCustomer(req.user.id).map((o) => ({ ...o, review: ReviewsRepo.byOrder(o.id) }));
  res.json({ orders });
}));

router.get("/:id", requireAuth, asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order) return res.status(404).json({ error: "الطلب غير موجود" });
  const { id: uid, role, storeId, driverId } = req.user;
  const allowed = role === "admin" || order.customerId === uid || (role === "store_owner" && order.storeId === storeId) || (role === "driver" && order.driverId === driverId);
  if (!allowed) return res.status(403).json({ error: "لا تملك صلاحية مشاهدة هذا الطلب" });
  const driver = order.driverId ? DriversRepo.get(order.driverId) : null;
  res.json({ order: { ...order, review: ReviewsRepo.byOrder(order.id) }, driver });
}));

router.post("/:id/review", requireAuth, requireRole("customer"), asyncRoute(async (req, res) => {
  const order = OrdersRepo.getFull(req.params.id);
  if (!order || order.customerId !== req.user.id) return res.status(404).json({ error: "الطلب غير موجود" });
  if (order.status !== "DELIVERED") return res.status(422).json({ error: "لا يمكن التقييم قبل اكتمال الطلب" });
  if (ReviewsRepo.byOrder(order.id)) return res.status(409).json({ error: "تم تقييم هذا الطلب مسبقًا" });
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
  const review = ReviewsRepo.create(order.id, order.storeId, req.user.id, rating, comment);
  res.status(201).json({ review });
}));

export default router;
