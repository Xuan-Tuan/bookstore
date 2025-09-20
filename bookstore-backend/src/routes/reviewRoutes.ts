import { Router } from "express";
import {
  createReview,
  deleteReview,
  getAllReviews,
  getBookRatingSummary,
  getBookReviews,
  getReviewById,
  getReviewsWithPagination,
  getUserReviews,
  updateReview,
} from "../controllers/reviewController";

const router = Router();

router.get("/", getAllReviews);
router.get("/:id", getReviewById);
router.get("/pagination/list", getReviewsWithPagination);
router.get("/book/:bookID", getBookReviews);
router.get("/user/:userID", getUserReviews);
router.get("/book/:bookID/summary", getBookRatingSummary);
router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
