import { Router } from "express";
import {
  login,
  logout,
  register,
  getProfile,
  changePassword,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", authenticate, getProfile);
router.put("/change-password", authenticate, changePassword);

export default router;
