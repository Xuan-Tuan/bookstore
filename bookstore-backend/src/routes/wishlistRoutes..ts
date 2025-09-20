import { Router } from "express";
import {
  addToWishlist,
  checkInWishlist,
  getAllWishlists,
  getWishlistById,
  getWishlistsWithPagination,
  getUserWishlist,
  removeFromWishlist,
  removeFromWishlistByUserAndBook,
} from "../controllers/wishlistController";

const router = Router();

router.get("/", getAllWishlists);
router.get("/:id", getWishlistById);
router.get("/pagination/list", getWishlistsWithPagination);
router.get("/user/:userID", getUserWishlist);
router.get("/check/in-wishlist", checkInWishlist);
router.post("/", addToWishlist);
router.delete("/:id", removeFromWishlist);
router.delete("/", removeFromWishlistByUserAndBook);

export default router;
