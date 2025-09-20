import {
  Prisma,
  PrismaClient,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  PaymentWithRelations,
  PaymentCreateInput,
  PaymentUpdateInput,
  PaymentFilters,
  PaymentResponse,
} from "../types/payment";

export interface PaginationResult {
  payments: PaymentWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const paymentService = {
  // GET ALL PAYMENTS
  async getAllPayments(
    filters: PaymentFilters
  ): Promise<PaymentWithRelations[]> {
    try {
      const {
        orderID,
        status,
        method,
        startDate,
        endDate,
        sortBy = "paidAt",
        sortOrder = "desc",
      } = filters;

      const where: Prisma.PaymentWhereInput = {};

      if (orderID) {
        where.orderID = orderID;
      }

      if (status) {
        where.status = status;
      }

      if (method) {
        where.method = method;
      }

      if (startDate || endDate) {
        where.paidAt = {};
        if (startDate) {
          where.paidAt.gte = startDate;
        }
        if (endDate) {
          where.paidAt.lte = endDate;
        }
      }

      // Determine sort field
      const validSortFields = ["paidAt", "amount", "createdAt"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "paidAt";

      const orderBy: Prisma.PaymentOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const payments = await prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                include: {
                  authentication: true,
                },
              },
            },
          },
        },
        orderBy,
      });

      return payments as PaymentWithRelations[];
    } catch (error) {
      console.error("Error in getAllPayments service:", error);
      throw new Error("Failed to retrieve payments");
    }
  },

  // GET PAYMENT BY ID
  async getPaymentById(id: string): Promise<PaymentWithRelations> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { paymentID: id },
        include: {
          order: {
            include: {
              user: {
                include: {
                  authentication: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      return payment as PaymentWithRelations;
    } catch (error) {
      console.error(`Error retrieving payment ${id}:`, error);
      if (error instanceof Error && error.message === "Payment not found") {
        throw error;
      }
      throw new Error("Failed to retrieve payment");
    }
  },

  // GET PAYMENT BY ORDER ID
  async getPaymentByOrderId(orderID: string): Promise<PaymentWithRelations> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { orderID },
        include: {
          order: {
            include: {
              user: {
                include: {
                  authentication: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Payment not found for this order");
      }

      return payment as PaymentWithRelations;
    } catch (error) {
      console.error(`Error retrieving payment for order ${orderID}:`, error);
      if (
        error instanceof Error &&
        error.message === "Payment not found for this order"
      ) {
        throw error;
      }
      throw new Error("Failed to retrieve payment for order");
    }
  },

  // GET PAYMENTS WITH PAGINATION
  async getPaymentsWithPagination(
    filters: PaymentFilters
  ): Promise<PaginationResult> {
    try {
      const {
        orderID,
        status,
        method,
        startDate,
        endDate,
        sortBy = "paidAt",
        sortOrder = "desc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.PaymentWhereInput = {};

      if (orderID) {
        where.orderID = orderID;
      }

      if (status) {
        where.status = status;
      }

      if (method) {
        where.method = method;
      }

      if (startDate || endDate) {
        where.paidAt = {};
        if (startDate) {
          where.paidAt.gte = startDate;
        }
        if (endDate) {
          where.paidAt.lte = endDate;
        }
      }

      // Determine sort field
      const validSortFields = ["paidAt", "amount", "createdAt"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "paidAt";

      const orderBy: Prisma.PaymentOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            order: {
              include: {
                user: {
                  include: {
                    authentication: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.payment.count({ where }),
      ]);

      return {
        payments: payments as PaymentWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getPaymentsWithPagination service:", error);
      throw new Error("Failed to retrieve payments with pagination");
    }
  },

  // CREATE PAYMENT
  async createPayment(
    paymentData: PaymentCreateInput
  ): Promise<PaymentWithRelations> {
    try {
      const { orderID, method, amount } = paymentData;

      return await prisma.$transaction(async (tx) => {
        // Check if order exists
        const order = await tx.order.findUnique({
          where: { orderID },
        });

        if (!order) {
          throw new Error("Order not found");
        }

        // Check if payment already exists for this order
        const existingPayment = await tx.payment.findUnique({
          where: { orderID },
        });

        if (existingPayment) {
          throw new Error("Payment already exists for this order");
        }

        // Validate amount matches order total
        if (Number(amount) !== Number(order.totalAmount)) {
          throw new Error(
            `Payment amount (${amount}) does not match order total (${order.totalAmount})`
          );
        }

        // Create payment
        const payment = await tx.payment.create({
          data: {
            paymentID: uuidv4(),
            orderID,
            status: PaymentStatus.processing,
            method,
            amount,
          },
          include: {
            order: {
              include: {
                user: {
                  include: {
                    authentication: true,
                  },
                },
              },
            },
          },
        });

        return payment as PaymentWithRelations;
      });
    } catch (error) {
      console.error("Error in createPayment service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Payment already exists for this order");
        }
        if (error.code === "P2003") {
          throw new Error("Invalid orderID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create payment");
    }
  },

  // UPDATE PAYMENT STATUS
  async updatePaymentStatus(
    id: string,
    status: PaymentStatus
  ): Promise<PaymentWithRelations> {
    try {
      const updateData: any = {
        status,
      };

      // If status is paid, set paidAt timestamp
      if (status === PaymentStatus.paid) {
        updateData.paidAt = new Date();
      }

      const payment = await prisma.payment.update({
        where: { paymentID: id },
        data: updateData,
        include: {
          order: {
            include: {
              user: {
                include: {
                  authentication: true,
                },
              },
            },
          },
        },
      });

      // If payment is completed, update order status to completed
      if (status === PaymentStatus.paid) {
        await prisma.order.update({
          where: { orderID: payment.orderID },
          data: { status: "completed" },
        });
      }

      return payment as PaymentWithRelations;
    } catch (error) {
      console.error(`Error updating payment ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Payment not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update payment");
    }
  },

  // PROCESS PAYMENT (Simulate payment processing)
  async processPayment(id: string): Promise<PaymentWithRelations> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { paymentID: id },
        include: {
          order: true,
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== PaymentStatus.processing) {
        throw new Error("Payment is not in processing status");
      }

      // Simulate payment processing (in real app, this would integrate with payment gateway)
      // For demo purposes, we'll randomly succeed or fail
      const isSuccess = Math.random() > 0.2; // 80% success rate

      const newStatus = isSuccess ? PaymentStatus.paid : PaymentStatus.failed;

      const updateData: any = {
        status: newStatus,
      };

      if (isSuccess) {
        updateData.paidAt = new Date();
      }

      const updatedPayment = await prisma.payment.update({
        where: { paymentID: id },
        data: updateData,
        include: {
          order: {
            include: {
              user: {
                include: {
                  authentication: true,
                },
              },
            },
          },
        },
      });

      // If payment is completed, update order status to completed
      if (isSuccess) {
        await prisma.order.update({
          where: { orderID: payment.orderID },
          data: { status: "completed" },
        });
      }

      return updatedPayment as PaymentWithRelations;
    } catch (error) {
      console.error(`Error processing payment ${id}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to process payment");
    }
  },

  // GET PAYMENT STATISTICS
  async getPaymentStatistics(): Promise<{
    totalPayments: number;
    totalRevenue: number;
    processingPayments: number;
    paidPayments: number;
    failedPayments: number;
    revenueByMethod: { [key in PaymentMethod]: number };
  }> {
    try {
      const [
        totalPayments,
        processingPayments,
        paidPayments,
        failedPayments,
        revenueResult,
        revenueByMethod,
      ] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { status: PaymentStatus.processing } }),
        prisma.payment.count({ where: { status: PaymentStatus.paid } }),
        prisma.payment.count({ where: { status: PaymentStatus.failed } }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.paid },
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ["method"],
          where: { status: PaymentStatus.paid },
          _sum: { amount: true },
        }),
      ]);

      const revenueByMethodResult = {
        qr_code: 0,
        credit_card: 0,
        cod: 0,
      } as { [key in PaymentMethod]: number };

      revenueByMethod.forEach((item) => {
        revenueByMethodResult[item.method] = Number(item._sum.amount) || 0;
      });

      return {
        totalPayments,
        totalRevenue: Number(revenueResult._sum.amount) || 0,
        processingPayments,
        paidPayments,
        failedPayments,
        revenueByMethod: revenueByMethodResult,
      };
    } catch (error) {
      console.error("Error getting payment statistics:", error);
      throw new Error("Failed to get payment statistics");
    }
  },

  // FORMAT PAYMENT RESPONSE
  formatPaymentResponse(payment: any): PaymentResponse {
    return {
      paymentID: payment.paymentID,
      orderID: payment.orderID,
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      paidAt: payment.paidAt,
      order: {
        orderID: payment.order.orderID,
        status: payment.order.status,
        totalAmount: Number(payment.order.totalAmount),
        userID: payment.order.userID,
      },
    };
  },
};
