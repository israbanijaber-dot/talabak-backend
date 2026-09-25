import { verifyToken } from "../utils/jwt.js";

/** يتحقق من وجود توكن JWT صالح ويربط بيانات المستخدم بالطلب (req.user) */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "غير مصرح، الرجاء تسجيل الدخول" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "الجلسة غير صالحة أو منتهية، الرجاء تسجيل الدخول مجددًا" });
  }
}

/** يتأكد أن دور المستخدم الحالي ضمن الأدوار المسموحة لهذا المسار */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "لا تملك صلاحية الوصول لهذا المورد" });
    }
    next();
  };
}
