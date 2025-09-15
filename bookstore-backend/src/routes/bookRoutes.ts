import { Router } from "express";
import {
  validateBook,
  validateBookUpdate,
  handleValidationErrors,
} from "../middleware/validation";
import {
  addBook,
  deleteBook,
  getAllBooks,
  getBookById,
  getBooksWithPagination,
  updateBook,
} from "../controllers/bookController";

const router = Router();

router.get("/", getAllBooks);
router.get("/:id", getBookById);
router.get("/pagination/list", getBooksWithPagination);
router.post("/", handleValidationErrors, addBook);
router.put("/:id", handleValidationErrors, updateBook);
router.delete("/:id", deleteBook);

export default router;
