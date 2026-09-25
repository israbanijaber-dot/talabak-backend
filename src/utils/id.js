import { v4 as uuidv4 } from "uuid";

export function newId(prefix) {
  return prefix ? `${prefix}_${uuidv4()}` : uuidv4();
}
