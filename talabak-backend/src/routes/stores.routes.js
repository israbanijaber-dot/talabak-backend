import { Router } from "express";
import { StoresRepo, ProductsRepo, FavoritesRepo } from "../db/repo.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", asyncRoute(async (req, res) => {
  res.json({ stores: StoresRepo.list() });
}));

router.get("/:id", asyncRoute(async (req, res) => {
  const store = StoresRepo.get(req.params.id);
  if (!store) return res.status(404).json({ error: "المحل غير موجود" });
  res.json({ store });
}));

router.get("/:id/products", asyncRoute(async (req, res) => {
  res.json({ products: ProductsRepo.byStore(req.params.id) });
}));

router.get("/me/favorites", requireAuth, asyncRoute(async (req, res) => {
  res.json({ storeIds: FavoritesRepo.list(req.user.id) });
}));

router.post("/:id/favorite", requireAuth, asyncRoute(async (req, res) => {
  const storeIds = FavoritesRepo.toggle(req.user.id, req.params.id);
  res.json({ storeIds });
}));

export default router;
