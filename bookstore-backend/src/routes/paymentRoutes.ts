import { Router } from "express";
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  getPaymentByOrderId,
  getPaymentsWithPagination,
  getPaymentStatistics,
  processPayment,
  updatePaymentStatus,
} from "../controllers/paymentController";

const router = Router();

router.get("/", getAllPayments);
router.get("/:id", getPaymentById);
router.get("/order/:orderID", getPaymentByOrderId);
router.get("/pagination/list", getPaymentsWithPagination);
router.get("/stats/statistics", getPaymentStatistics);
router.post("/", createPayment);
router.put("/:id/status", updatePaymentStatus);
router.put("/:id/process", processPayment);

export default router;
