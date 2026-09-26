// يتحقق من رقم هاتف فلسطيني أو إسرائيلي (نفس صيغة الشبكات المحلية): 05XXXXXXXX
// أو بصيغة دولية تبدأ بـ +970 أو +972
const PHONE_REGEX = /^(?:\+970|\+972|970|972|0)5\d{8}$/;

export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).trim().replace(/[\s-]/g, "");
  return PHONE_REGEX.test(cleaned);
}
