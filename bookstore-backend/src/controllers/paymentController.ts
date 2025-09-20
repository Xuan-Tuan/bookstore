import { Request, Response } from "express";
import { paymentService } from "../services/paymentService";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export const getAllPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sortBy = "paidAt",
      sortOrder = "desc",
      orderID,
      status,
      method,
      startDate,
      endDate,
    } = req.query;

    const filters = {
      orderID: orderID as string,
      status: status as PaymentStatus,
      method: method as PaymentMethod,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const payments = await paymentService.getAllPayments(filters);

    res.status(200).json({
      success: true,
      data: payments,
      filters: {
        ...(orderID && { orderID }),
        ...(status && { status }),
        ...(method && { method }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Payments retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving payments:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving payments",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    res.status(200).json({
      success: true,
      data: payment,
      message: "Payment retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving payment:", error);

    if (error instanceof Error) {
      if (error.message === "Payment not found") {
        res.status(404).json({
          success: false,
          message: "Payment not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving payment details",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error retrieving payment",
      error: "Internal server error",
    });
  }
};

export const getPaymentByOrderId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderID } = req.params;
    const payment = await paymentService.getPaymentByOrderId(orderID);

    res.status(200).json({
      success: true,
      data: payment,
      message: "Payment retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving payment:", error);

    if (error instanceof Error) {
      if (error.message === "Payment not found for this order") {
        res.status(404).json({
          success: false,
          message: "Payment not found for this order",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error retrieving payment",
      error: "Internal server error",
    });
  }
};

export const getPaymentsWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      orderID,
      status,
      method,
      startDate,
      endDate,
      sortBy = "paidAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      orderID: orderID as string,
      status: status as PaymentStatus,
      method: method as PaymentMethod,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await paymentService.getPaymentsWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        payments: result.payments,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: filters.limit,
          hasNext: result.currentPage < result.totalPages,
          hasPrev: result.currentPage > 1,
        },
      },
      filters: {
        ...(orderID && { orderID }),
        ...(status && { status }),
        ...(method && { method }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Payments retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving payments with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving payments",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const createPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderID, method, amount } = req.body;

    if (!orderID || !method || !amount) {
      res.status(400).json({
        success: false,
        message: "OrderID, Method, and Amount are required",
      });
      return;
    }

    if (!Object.values(PaymentMethod).includes(method)) {
      res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
      return;
    }

    const payment = await paymentService.createPayment({
      orderID: orderID.trim(),
      method: method as PaymentMethod,
      amount: parseFloat(amount),
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: "Payment created successfully",
    });
  } catch (error) {
    console.error("Error creating payment:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("does not match")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updatePaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(PaymentStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
      return;
    }

    const payment = await paymentService.updatePaymentStatus(
      id,
      status as PaymentStatus
    );

    res.status(200).json({
      success: true,
      data: payment,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment status:", error);

    if (error instanceof Error) {
      if (error.message === "Payment not found") {
        res.status(404).json({
          success: false,
          message: "Payment not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const processPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = await paymentService.processPayment(id);

    res.status(200).json({
      success: true,
      data: payment,
      message: `Payment processed successfully. Status: ${payment.status}`,
    });
  } catch (error) {
    console.error("Error processing payment:", error);

    if (error instanceof Error) {
      if (error.message === "Payment not found") {
        res.status(404).json({
          success: false,
          message: "Payment not found",
        });
        return;
      }

      if (error.message.includes("not in processing status")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error processing payment",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const getPaymentStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const statistics = await paymentService.getPaymentStatistics();

    res.status(200).json({
      success: true,
      data: statistics,
      message: "Payment statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving payment statistics:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving payment statistics",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
