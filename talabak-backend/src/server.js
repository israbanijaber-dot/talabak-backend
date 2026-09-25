import "dotenv/config";
import { createApp } from "./app.js";
import db from "./db/index.js";

// يتأكد من وجود بيانات أولية (محلات/منتجات/حسابات تجريبية) قبل بدء الخادم لأول مرة
const usersCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (usersCount === 0) {
  console.log("لا توجد بيانات بعد، يتم زرع البيانات التجريبية تلقائيًا...");
  await import("./db/seed.js");
}

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ خادم طلبك يعمل على http://localhost:${PORT}`);
  console.log(`   فحص الحالة: http://localhost:${PORT}/api/health`);
});
