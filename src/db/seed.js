import bcrypt from "bcryptjs";
import db from "./index.js";
import { newId } from "../utils/id.js";

const already = db.prepare("SELECT COUNT(*) AS c FROM users").get().c > 0;
if (already) {
  console.log("قاعدة البيانات مهيّأة مسبقًا، لن يتم إعادة زرع البيانات. احذف ملف data/talabak.sqlite لإعادة البدء من جديد.");
  process.exit(0);
}

const now = Date.now();

const stores = [
  { id: "s1", name: "مطعم عقربا", category: "restaurants", rating: 4.6, deliveryTime: "25-35 دقيقة", deliveryFee: 7, minOrder: 20, isOpen: 1, phone: "0599-000111", address: "حي الوسط، عقربا", cover: "🍔" },
  { id: "s2", name: "بقالة عقربا", category: "grocery", rating: 4.4, deliveryTime: "15-25 دقيقة", deliveryFee: 5, minOrder: 15, isOpen: 1, phone: "0599-000222", address: "حي الشرق، عقربا", cover: "🛒" },
  { id: "s3", name: "مخبز البلد", category: "bakery", rating: 4.8, deliveryTime: "10-20 دقيقة", deliveryFee: 4, minOrder: 0, isOpen: 1, phone: "0599-000333", address: "حي الوسط، عقربا", cover: "🥖" },
  { id: "s4", name: "حلويات البلد", category: "sweets", rating: 4.7, deliveryTime: "20-30 دقيقة", deliveryFee: 6, minOrder: 20, isOpen: 1, phone: "0599-000444", address: "حي الغرب، عقربا", cover: "🍮" },
];

const insertStore = db.prepare(`INSERT INTO stores (id, name, category, description, cover, phone, address, delivery_fee, min_order, delivery_time, is_open, rating, created_at, updated_at)
  VALUES (@id,@name,@category,'',@cover,@phone,@address,@deliveryFee,@minOrder,@deliveryTime,@isOpen,@rating,@now,@now)`);
for (const s of stores) insertStore.run({ ...s, now });

const products = [
  { storeId: "s1", name: "برجر عقربا", description: "برجر لحم بلدي مع خس وطماطم وجبنة وصوص خاص", price: 28, category: "الأكثر مبيعًا", image: "🍔",
    options: [{ id: "size", name: "الحجم", type: "single", required: true, choices: [{ name: "عادي", price: 0 }, { name: "كبير", price: 6 }] }] },
  { storeId: "s1", name: "دجاج مقلي (5 قطع)", description: "قطع دجاج مقرمشة مع صوص ثوم", price: 25, category: "الوجبات", image: "🍗" },
  { storeId: "s1", name: "بطاطا مقلية", description: "بطاطا مقرمشة مع كاتشب ومايونيز", price: 10, category: "المقبلات", image: "🍟" },
  { storeId: "s2", name: "أرز مصري 1 كغم", description: "أرز مصري فاخر", price: 12, category: "المواد الأساسية", image: "🍚" },
  { storeId: "s2", name: "زيت زيتون بلدي 1 لتر", description: "من زيتون عقربا مباشرة", price: 38, category: "المواد الأساسية", image: "🫒" },
  { storeId: "s3", name: "خبز طابون", description: "خبز طازج يخرج من الفرن على مدار اليوم", price: 3, category: "خبز", image: "🍞" },
  { storeId: "s3", name: "مناقيش زعتر", description: "مناقيش زعتر بلدي بزيت الزيتون", price: 4, category: "مناقيش", image: "🫓" },
  { storeId: "s4", name: "كنافة نابلسية (كغم)", description: "كنافة طازجة بالجبنة والقطر", price: 35, category: "كنافة", image: "🍮" },
];
const insertProduct = db.prepare(`INSERT INTO products (id, store_id, name, description, price, category, image, available, options_json, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,1,?,?,?)`);
for (const p of products) insertProduct.run(newId("p"), p.storeId, p.name, p.description, p.price, p.category, p.image, JSON.stringify(p.options || []), now, now);

db.prepare("INSERT INTO drivers (id, name, phone, is_active, created_at) VALUES (?,?,?,1,?)").run("d1", "أحمد المندوب", "0599-777888", now);

const users = [
  { id: "u_customer_demo", name: "محمد سالم", phone: "0599-111222", email: "customer@talabak.local", password: "Aqraba@2026C", role: "customer", storeId: null, driverId: null },
  { id: "so1", name: "صاحب مطعم عقربا", phone: "0599-000111", email: "store@talabak.local", password: "Aqraba@2026S", role: "store_owner", storeId: "s1", driverId: null },
  { id: "d1", name: "أحمد المندوب", phone: "0599-777888", email: "driver@talabak.local", password: "Aqraba@2026D", role: "driver", storeId: null, driverId: "d1" },
  { id: "a1", name: "مدير طلبك", phone: "0599-000000", email: "admin@talabak.local", password: "Aqraba@2026A", role: "admin", storeId: null, driverId: null },
];
const insertUser = db.prepare(`INSERT INTO users (id, name, phone, email, password_hash, role, store_id, driver_id, is_active, created_at)
  VALUES (?,?,?,?,?,?,?,?,1,?)`);
for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(u.id, u.name, u.phone, u.email, hash, u.role, u.storeId, u.driverId, now);
}

console.log("تم زرع البيانات التجريبية بنجاح ✅");
console.log("حسابات الدخول موجودة في ملف DEMO_CREDENTIALS.md بمجلد المشروع الرئيسي.");
