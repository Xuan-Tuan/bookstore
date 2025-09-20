import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderStatistics,
  getOrdersWithPagination,
  getUserOrders,
  updateOrderStatus,
} from "../controllers/orderController";

const router = Router();

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.get("/pagination/list", getOrdersWithPagination);
router.get("/user/:userID", getUserOrders);
router.get("/stats/statistics", getOrderStatistics);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);
router.put("/:id/cancel", cancelOrder);

export default router;
