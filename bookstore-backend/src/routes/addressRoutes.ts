import { Router } from "express";
import {
  createAddress,
  deleteAddress,
  getAllAddresses,
  getAddressById,
  getUserAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/addressController";

const router = Router();

router.get("/", getAllAddresses);
router.get("/:id", getAddressById);
router.get("/user/:userID", getUserAddresses);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);
router.post("/set-default", setDefaultAddress);

export default router;
