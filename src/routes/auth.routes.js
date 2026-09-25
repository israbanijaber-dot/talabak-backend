import { Router } from "express";
import bcrypt from "bcryptjs";
import { UsersRepo } from "../db/repo.js";
import { signToken } from "../utils/jwt.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", asyncRoute(async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: "الرجاء تعبئة جميع الحقول" });
  }
  if (UsersRepo.byEmail(email)) {
    return res.status(409).json({ error: "هذا البريد الإلكتروني مستخدم بالفعل" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = UsersRepo.createCustomer({ name, phone, email, passwordHash });
  const token = signToken({ id: user.id, role: user.role, storeId: user.store_id, driverId: user.driver_id });
  res.status(201).json({ token, user: UsersRepo.toPublic(user) });
}));

router.post("/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
  const user = UsersRepo.byEmail(email);
  if (!user) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  const token = signToken({ id: user.id, role: user.role, storeId: user.store_id, driverId: user.driver_id });
  res.json({ token, user: UsersRepo.toPublic(user) });
}));

router.get("/me", requireAuth, asyncRoute(async (req, res) => {
  const user = UsersRepo.byId(req.user.id);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  res.json({ user: UsersRepo.toPublic(user) });
}));

export default router;
