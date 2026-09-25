import db from "./index.js";
import { newId } from "../utils/id.js";

/* -------------------------------- تحويل الصفوف -------------------------------- */
function mapStore(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, category: row.category, description: row.description,
    cover: row.cover, phone: row.phone, address: row.address,
    deliveryFee: row.delivery_fee, minOrder: row.min_order, deliveryTime: row.delivery_time,
    isOpen: !!row.is_open, rating: row.rating,
  };
}
function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id, storeId: row.store_id, name: row.name, description: row.description,
    price: row.price, category: row.category, image: row.image, available: !!row.available,
    options: JSON.parse(row.options_json || "[]"),
  };
}
function mapOrder(row, items, history) {
  return {
    id: row.id, customerId: row.customer_id, customerName: row.customer_name, customerPhone: row.customer_phone,
    storeId: row.store_id, storeName: row.store_name, driverId: row.driver_id,
    address: JSON.parse(row.address_json), phone: row.phone, orderNotes: row.order_notes,
    subtotal: row.subtotal, deliveryFee: row.delivery_fee, total: row.total,
    paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
    items: items.map((it) => ({ productId: it.product_id, name: it.name, price: it.price, quantity: it.quantity, options: JSON.parse(it.options_json || "[]"), notes: it.notes })),
    history: history.map((h) => ({ status: h.status, at: h.at })),
  };
}

/* ---------------------------------- المحلات ---------------------------------- */
export const StoresRepo = {
  list() { return db.prepare("SELECT * FROM stores ORDER BY name").all().map(mapStore); },
  get(id) { return mapStore(db.prepare("SELECT * FROM stores WHERE id = ?").get(id)); },
  update(id, patch) {
    const fields = [];
    const values = [];
    const map = { isOpen: "is_open", deliveryFee: "delivery_fee", minOrder: "min_order", deliveryTime: "delivery_time" };
    for (const [key, col] of Object.entries(map)) {
      if (key in patch) { fields.push(`${col} = ?`); values.push(key === "isOpen" ? (patch[key] ? 1 : 0) : patch[key]); }
    }
    if (fields.length === 0) return this.get(id);
    values.push(Date.now(), id);
    db.prepare(`UPDATE stores SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`).run(...values);
    return this.get(id);
  },
};

/* --------------------------------- المنتجات ---------------------------------- */
export const ProductsRepo = {
  byStore(storeId) { return db.prepare("SELECT * FROM products WHERE store_id = ? ORDER BY category").all(storeId).map(mapProduct); },
  get(id) { return mapProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id)); },
  create(storeId, p) {
    const id = newId("p");
    const now = Date.now();
    db.prepare(`INSERT INTO products (id, store_id, name, description, price, category, image, available, options_json, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, storeId, p.name, p.description || "", p.price, p.category || "عام", p.image || "🍽️", p.available === false ? 0 : 1, JSON.stringify(p.options || []), now, now);
    return this.get(id);
  },
  update(id, storeId, patch) {
    const existing = db.prepare("SELECT * FROM products WHERE id = ? AND store_id = ?").get(id, storeId);
    if (!existing) return null;
    const merged = { ...mapProduct(existing), ...patch };
    db.prepare(`UPDATE products SET name=?, description=?, price=?, category=?, image=?, available=?, options_json=?, updated_at=? WHERE id=?`)
      .run(merged.name, merged.description, merged.price, merged.category, merged.image, merged.available ? 1 : 0, JSON.stringify(merged.options || []), Date.now(), id);
    return this.get(id);
  },
  remove(id, storeId) {
    return db.prepare("DELETE FROM products WHERE id = ? AND store_id = ?").run(id, storeId).changes > 0;
  },
};

/* ---------------------------------- الطلبات ----------------------------------- */
export const OrdersRepo = {
  getFull(id) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    if (!row) return null;
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id);
    const history = db.prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY at").all(id);
    return mapOrder(row, items, history);
  },
  listWhere(clause, params) {
    const rows = db.prepare(`SELECT * FROM orders WHERE ${clause} ORDER BY created_at DESC`).all(...params);
    return rows.map((row) => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(row.id);
      const history = db.prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY at").all(row.id);
      return mapOrder(row, items, history);
    });
  },
  byCustomer(customerId) { return this.listWhere("customer_id = ?", [customerId]); },
  byStore(storeId) { return this.listWhere("store_id = ?", [storeId]); },
  byDriver(driverId) { return this.listWhere("driver_id = ?", [driverId]); },
  available() { return this.listWhere("status = 'READY' AND driver_id IS NULL", []); },
  all(status) { return status ? this.listWhere("status = ?", [status]) : this.listWhere("1 = 1", []); },

  create({ customer, store, items, address, phone, orderNotes }) {
    const id = newId("o");
    const now = Date.now();
    const subtotal = items.reduce((s, it) => s + it.quantity * (it.price + (it.options || []).reduce((a, o) => a + o.price, 0)), 0);
    const deliveryFee = store.deliveryFee;
    const total = subtotal + deliveryFee;

    const insertOrder = db.prepare(`INSERT INTO orders
      (id, customer_id, customer_name, customer_phone, store_id, store_name, driver_id, address_json, phone, order_notes, subtotal, delivery_fee, total, payment_method, payment_status, status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?, 'COD', 'PENDING', 'PENDING', ?, ?)`);
    const insertItem = db.prepare(`INSERT INTO order_items (id, order_id, product_id, name, price, quantity, options_json, notes) VALUES (?,?,?,?,?,?,?,?)`);
    const insertHistory = db.prepare(`INSERT INTO order_status_history (id, order_id, status, at) VALUES (?,?,?,?)`);

    const tx = db.transaction(() => {
      insertOrder.run(id, customer.id, customer.name, phone, store.id, store.name, JSON.stringify(address), phone, orderNotes || "", subtotal, deliveryFee, total, now, now);
      for (const it of items) {
        insertItem.run(newId("oi"), id, it.productId, it.name, it.price, it.quantity, JSON.stringify(it.options || []), it.notes || "");
      }
      insertHistory.run(newId("h"), id, "PENDING", now);
    });
    tx();
    return this.getFull(id);
  },

  setStatus(id, status) {
    const now = Date.now();
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, now, id);
    db.prepare("INSERT INTO order_status_history (id, order_id, status, at) VALUES (?,?,?,?)").run(newId("h"), id, status, now);
    return this.getFull(id);
  },
  assignDriver(id, driverId) {
    db.prepare("UPDATE orders SET driver_id = ? WHERE id = ?").run(driverId, id);
    return this.setStatus(id, "ASSIGNED");
  },
  setPaymentCollected(id) {
    db.prepare("UPDATE orders SET payment_status = 'COLLECTED', updated_at = ? WHERE id = ?").run(Date.now(), id);
    return this.getFull(id);
  },
};

/* ---------------------------------- المفضلة ----------------------------------- */
export const FavoritesRepo = {
  list(userId) { return db.prepare("SELECT store_id FROM favorites WHERE user_id = ?").all(userId).map((r) => r.store_id); },
  toggle(userId, storeId) {
    const existing = db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND store_id = ?").get(userId, storeId);
    if (existing) db.prepare("DELETE FROM favorites WHERE user_id = ? AND store_id = ?").run(userId, storeId);
    else db.prepare("INSERT INTO favorites (user_id, store_id, created_at) VALUES (?,?,?)").run(userId, storeId, Date.now());
    return this.list(userId);
  },
};

/* --------------------------------- التقييمات ---------------------------------- */
export const ReviewsRepo = {
  create(orderId, storeId, customerId, rating, comment) {
    const id = newId("rv");
    db.prepare("INSERT INTO reviews (id, order_id, store_id, customer_id, rating, comment, created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, orderId, storeId, customerId, rating, comment || "", Date.now());
    return { id, orderId, storeId, rating, comment };
  },
  byOrder(orderId) {
    const row = db.prepare("SELECT * FROM reviews WHERE order_id = ?").get(orderId);
    return row ? { rating: row.rating, comment: row.comment } : null;
  },
};

/* ---------------------------------- المندوبون --------------------------------- */
export const DriversRepo = {
  list() { return db.prepare("SELECT * FROM drivers").all(); },
  get(id) { return db.prepare("SELECT * FROM drivers WHERE id = ?").get(id); },
  setActive(id, isActive) { db.prepare("UPDATE drivers SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id); return this.get(id); },
};

/* ----------------------------------- المستخدمون -------------------------------- */
export const UsersRepo = {
  byEmail(email) { return db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()); },
  byId(id) { return db.prepare("SELECT * FROM users WHERE id = ?").get(id); },
  createCustomer({ name, phone, email, passwordHash }) {
    const id = newId("u");
    db.prepare(`INSERT INTO users (id, name, phone, email, password_hash, role, store_id, driver_id, is_active, created_at)
                VALUES (?,?,?,?,?, 'customer', NULL, NULL, 1, ?)`)
      .run(id, name, phone, email.trim().toLowerCase(), passwordHash, Date.now());
    return this.byId(id);
  },
  toPublic(u) {
    return { id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, storeId: u.store_id, driverId: u.driver_id };
  },
};
