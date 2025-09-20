import Router from "express";
import {
  addAuthor,
  deleteAuthor,
  getAllAuthors,
  getAuthorById,
  getAuthorsWithPagination,
  updateAuthor,
} from "../controllers/authorController";

const router = Router();
router.get("/", getAllAuthors);
router.get("/:id", getAuthorById);
router.get("/pagination/list", getAuthorsWithPagination);
router.post("/", addAuthor);
router.put("/:id", updateAuthor);
router.delete("/:id", deleteAuthor);

export default router;
