import { Router } from "express";
import {
  addUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUsersWithPagination,
  updateUser,
} from "../controllers/userController";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.get("/pagination/list", getUsersWithPagination);
router.post("/", addUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
