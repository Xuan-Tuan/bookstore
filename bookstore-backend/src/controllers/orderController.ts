import { Request, Response } from "express";
import { orderService } from "../services/orderService";
import { OrderStatus } from "@prisma/client";

export const getAllOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sortBy = "createdAt",
      sortOrder = "desc",
      userID,
      status,
      startDate,
      endDate,
    } = req.query;

    const filters = {
      userID: userID as string,
      status: status as OrderStatus,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    };

    const orders = await orderService.getAllOrders(filters);

    res.status(200).json({
      success: true,
      data: orders,
      filters: {
        ...(userID && { userID }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Orders retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving orders:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    res.status(200).json({
      success: true,
      data: order,
      message: "Order retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving order:", error);

    if (error instanceof Error) {
      if (error.message === "Order not found") {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      if (error.message.includes("Failed to retrieve")) {
        res.status(500).json({
          success: false,
          message: "Error retrieving order details",
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
      message: "Error retrieving order",
      error: "Internal server error",
    });
  }
};

export const getOrdersWithPagination = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      userID,
      status,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {
      userID: userID as string,
      status: status as OrderStatus,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: Math.max(1, parseInt(page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string) || 10)),
    };

    const result = await orderService.getOrdersWithPagination(filters);

    res.status(200).json({
      success: true,
      data: {
        orders: result.orders,
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
        ...(userID && { userID }),
        ...(status && { status }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      sort: {
        by: sortBy,
        order: sortOrder,
      },
      message: "Orders retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving orders with pagination:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

export const getUserOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID } = req.params;
    const orders = await orderService.getUserOrders(userID);

    res.status(200).json({
      success: true,
      data: orders,
      message: "User orders retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving user orders:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving user orders",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID, addressID, phone, items } = req.body;

    if (!userID || !addressID || !phone || !items) {
      res.status(400).json({
        success: false,
        message: "UserID, AddressID, Phone, and Items are required",
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Items must be a non-empty array",
      });
      return;
    }

    const order = await orderService.createOrder({
      userID: userID.trim(),
      addressID: addressID.trim(),
      phone: phone.trim(),
      items: items.map((item: any) => ({
        bookID: item.bookID.trim(),
        quantity: parseInt(item.quantity),
      })),
    });

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Not enough stock")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("must have at least one item")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating order",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
      return;
    }

    const order = await orderService.updateOrderStatus(id, status);

    res.status(200).json({
      success: true,
      data: order,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);

    if (error instanceof Error) {
      if (error.message === "Order not found") {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderService.cancelOrder(id);

    res.status(200).json({
      success: true,
      data: order,
      message: "Order canceled successfully",
    });
  } catch (error) {
    console.error("Error canceling order:", error);

    if (error instanceof Error) {
      if (error.message === "Order not found") {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      if (error.message.includes("Only pending orders can be canceled")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Error canceling order",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};

export const getOrderStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userID } = req.query;
    const statistics = await orderService.getOrderStatistics(userID as string);

    res.status(200).json({
      success: true,
      data: statistics,
      message: "Order statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving order statistics:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving order statistics",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
};
