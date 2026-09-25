/** يلف أي دالة مسار async حتى تُمرَّر الأخطاء تلقائيًا لمعالج الأخطاء المركزي */
export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "المسار غير موجود" });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "حدث خطأ غير متوقع في الخادم" });
}
