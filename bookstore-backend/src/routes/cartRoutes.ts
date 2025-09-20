import { Router } from "express";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "../controllers/cartController";

const router = Router();

router.get("/:userID", getCart);
router.post("/:userID/items", addToCart);
router.put("/:userID/items/:bookID", updateCartItem);
router.delete("/:userID/items/:bookID", removeFromCart);
router.delete("/:userID/clear", clearCart);

export default router;
