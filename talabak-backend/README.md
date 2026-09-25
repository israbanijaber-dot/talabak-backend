# طلبك — الخادم الحقيقي (Backend)

REST API حقيقي لتطبيق "طلبك" — Node.js + Express + SQLite (قاعدة بيانات حقيقية بملف واحد، بدون أي إعداد خادم منفصل)، مصادقة JWT حقيقية، وتشفير كلمات مرور حقيقي (bcrypt).

## التشغيل المحلي (على جهازك)

يتطلب [Node.js](https://nodejs.org) نسخة 18 أو أحدث.

```bash
cd talabak-backend
npm install
cp .env.example .env
npm run dev
```

عند أول تشغيل، يزرع الخادم البيانات التجريبية تلقائيًا (المحلات، المنتجات، الحسابات الأربعة). بعدها الخادم يعمل على:

```
http://localhost:4000/api
```

جرّبه بمتصفحك: `http://localhost:4000/api/health` — لازم ترجع `{"ok": true}`.

## حسابات الدخول التجريبية

نفس الحسابات الموجودة في ملف `DEMO_CREDENTIALS.md` بمجلد المشروع الرئيسي:
customer@talabak.local / Aqraba@2026C، store@talabak.local / Aqraba@2026S، driver@talabak.local / Aqraba@2026D، admin@talabak.local / Aqraba@2026A.

كلمات المرور الآن **مشفّرة فعليًا بـ bcrypt** داخل قاعدة البيانات — لا أحد يقدر يقرأها حتى لو فتح ملف القاعدة مباشرة.

## أهم نقاط الـ API

| Method | المسار | الوصف | الصلاحية |
|---|---|---|---|
| POST | `/api/auth/register` | تسجيل عميل جديد | عام |
| POST | `/api/auth/login` | تسجيل الدخول (يرجع JWT) | عام |
| GET | `/api/stores` | كل المحلات | عام |
| GET | `/api/stores/:id/products` | منتجات محل | عام |
| POST | `/api/orders` | إنشاء طلب جديد | عميل |
| GET | `/api/orders/mine` | طلباتي | عميل |
| GET | `/api/orders/:id` | تتبع طلب | صاحب العلاقة |
| POST | `/api/orders/:id/review` | تقييم طلب مكتمل | عميل |
| GET/PATCH | `/api/store/orders...` | إدارة طلبات المحل | صاحب محل |
| CRUD | `/api/store/products` | إدارة منتجات المحل | صاحب محل |
| GET | `/api/driver/available` | الطلبات المتاحة | مندوب |
| POST | `/api/driver/orders/:id/accept` | قبول طلب | مندوب |
| PATCH | `/api/driver/orders/:id/status` | تحديث حالة التوصيل | مندوب |
| POST | `/api/driver/orders/:id/collect-cash` | تأكيد تحصيل المبلغ | مندوب |
| GET | `/api/admin/stats` | إحصائيات عامة | إدارة |
| GET | `/api/admin/orders` | كل الطلبات | إدارة |

كل مسار محمي يتطلب Header: `Authorization: Bearer <token>` (التوكن يرجع من تسجيل الدخول).

## قاعدة البيانات

- ملف SQLite واحد يُنشأ تلقائيًا في `data/talabak.sqlite` — هذا الملف **هو قاعدة البيانات الحقيقية**، وكل الطلبات والمحلات محفوظة فيه بشكل دائم بين كل مرة تشغّل فيها الخادم.
- لإعادة البدء من الصفر: احذف مجلد `data/` وشغّل الخادم مجددًا.
- لإعادة الزرع يدويًا: `npm run seed`.
- عند الانتقال للإنتاج الحقيقي على PostgreSQL، استخدم `src/db/schema.postgres.sql` كنقطة بداية (نفس بنية الجداول).

## النشر (Deployment) على استضافة مجانية

الخيار الأبسط: [Render.com](https://render.com) (طبقة مجانية):
1. ارفع مجلد `talabak-backend` كمستودع على GitHub.
2. من Render: New → Web Service → اختر المستودع.
3. Build Command: `npm install` — Start Command: `npm start`.
4. أضف متغيرات البيئة (`JWT_SECRET`, `FRONTEND_ORIGIN`) من إعدادات الخدمة.
5. بعد النشر، بيصير عندك رابط دائم مثل `https://talabak-backend.onrender.com` — هذا هو الرابط اللي بتحطه بالواجهة الأمامية.

⚠️ ملاحظة: الطبقة المجانية بـ Render تحفظ الملفات محليًا لكنها قد تُصفَّر عند إعادة تشغيل الخدمة تلقائيًا (Ephemeral Disk). للاستخدام الحقيقي والدائم في عقربا، يُفضّل بعد التجربة الانتقال لقاعدة PostgreSQL مُدارة (متوفرة مجانًا أيضًا كخدمة منفصلة على Render أو Railway) بدل ملف SQLite.
