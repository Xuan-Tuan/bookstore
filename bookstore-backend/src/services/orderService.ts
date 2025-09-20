import { Prisma, PrismaClient, OrderStatus } from "@prisma/client";
import prisma from "../config/db";
import { v4 as uuidv4 } from "uuid";
import {
  OrderWithRelations,
  OrderCreateInput,
  OrderUpdateInput,
  OrderFilters,
  OrderResponse,
  OrderItemResponse,
} from "../types/order";

export interface PaginationResult {
  orders: OrderWithRelations[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const orderService = {
  // GET ALL ORDERS
  async getAllOrders(filters: OrderFilters): Promise<OrderWithRelations[]> {
    try {
      const {
        userID,
        status,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      const where: Prisma.OrderWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Determine sort field
      const validSortFields = ["createdAt", "totalAmount"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

      const orderBy: Prisma.OrderOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
          books: {
            include: {
              book: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
        },
        orderBy,
      });

      return orders as OrderWithRelations[];
    } catch (error) {
      console.error("Error in getAllOrders service:", error);
      throw new Error("Failed to retrieve orders");
    }
  },

  // GET ORDER BY ID
  async getOrderById(id: string): Promise<OrderWithRelations> {
    try {
      const order = await prisma.order.findUnique({
        where: { orderID: id },
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
          books: {
            include: {
              book: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order as OrderWithRelations;
    } catch (error) {
      console.error(`Error retrieving order ${id}:`, error);
      if (error instanceof Error && error.message === "Order not found") {
        throw error;
      }
      throw new Error("Failed to retrieve order");
    }
  },

  // GET ORDERS WITH PAGINATION
  async getOrdersWithPagination(
    filters: OrderFilters
  ): Promise<PaginationResult> {
    try {
      const {
        userID,
        status,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;
      const where: Prisma.OrderWhereInput = {};

      if (userID) {
        where.userID = userID;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Determine sort field
      const validSortFields = ["createdAt", "totalAmount"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

      const orderBy: Prisma.OrderOrderByWithRelationInput = {
        [sortField]: sortOrder ?? "desc",
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: {
              include: {
                authentication: true,
              },
            },
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
            payment: true,
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders: orders as OrderWithRelations[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Error in getOrdersWithPagination service:", error);
      throw new Error("Failed to retrieve orders with pagination");
    }
  },

  // GET USER ORDERS
  async getUserOrders(userID: string): Promise<OrderWithRelations[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { userID },
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
          books: {
            include: {
              book: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders as OrderWithRelations[];
    } catch (error) {
      console.error(`Error retrieving orders for user ${userID}:`, error);
      throw new Error("Failed to retrieve user orders");
    }
  },

  // CREATE ORDER
  async createOrder(orderData: OrderCreateInput): Promise<OrderResponse> {
    try {
      const { userID, addressID, phone, items } = orderData;

      return await prisma.$transaction(async (tx) => {
        // Check if user exists
        const user = await tx.user.findUnique({
          where: { userID },
          include: {
            addresses: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Check if address belongs to user
        const address = user.addresses.find(
          (addr) => addr.addressID === addressID
        );
        if (!address) {
          throw new Error("Address not found or does not belong to user");
        }

        // Format address snapshot
        const addressSnapshot = `${
          address.specificAddress ? address.specificAddress + ", " : ""
        }${address.ward}, ${address.city}`;

        // Validate items
        if (!items || items.length === 0) {
          throw new Error("Order must have at least one item");
        }

        let totalAmount = 0;
        const orderBooks: any[] = [];

        // Process each item
        for (const item of items) {
          const book = await tx.book.findUnique({
            where: { bookID: item.bookID },
          });

          if (!book) {
            throw new Error(`Book ${item.bookID} not found`);
          }

          if (item.quantity > book.stockQuantity) {
            throw new Error(
              `Not enough stock for book ${book.title}. Available: ${book.stockQuantity}`
            );
          }

          if (item.quantity <= 0) {
            throw new Error(`Invalid quantity for book ${book.title}`);
          }

          const subTotal = Number(book.price) * item.quantity;
          totalAmount += subTotal;

          orderBooks.push({
            bookID: item.bookID,
            priceAtTime: book.price,
            quantity: item.quantity,
            subTotal,
          });

          // Update book stock
          await tx.book.update({
            where: { bookID: item.bookID },
            data: {
              stockQuantity: book.stockQuantity - item.quantity,
              soldNumber: book.soldNumber + item.quantity,
            },
          });
        }

        // Create order
        const order = await tx.order.create({
          data: {
            orderID: uuidv4(),
            userID,
            status: OrderStatus.pending,
            totalAmount,
            addressSnapshot,
            phoneSnapshot: phone,
            books: {
              create: orderBooks.map((item) => ({
                bookID: item.bookID,
                priceAtTime: item.priceAtTime,
                quantity: item.quantity,
                subTotal: item.subTotal,
              })),
            },
          },
          include: {
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
            payment: true,
          },
        });

        return this.formatOrderResponse(order);
      });
    } catch (error) {
      console.error("Error in createOrder service:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Invalid userID or bookID");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to create order");
    }
  },

  // UPDATE ORDER STATUS
  async updateOrderStatus(
    id: string,
    status: OrderStatus
  ): Promise<OrderResponse> {
    try {
      const existingOrder = await prisma.order.findUnique({
        where: { orderID: id },
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      const order = await prisma.order.update({
        where: { orderID: id },
        data: { status },
        include: {
          user: {
            include: {
              authentication: true,
            },
          },
          books: {
            include: {
              book: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
        },
      });

      return this.formatOrderResponse(order);
    } catch (error) {
      console.error(`Error updating order ${id}:`, error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Order not found");
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to update order");
    }
  },

  // CANCEL ORDER
  async cancelOrder(id: string): Promise<OrderResponse> {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { orderID: id },
          include: {
            books: true,
          },
        });

        if (!order) {
          throw new Error("Order not found");
        }

        if (order.status !== OrderStatus.pending) {
          throw new Error("Only pending orders can be canceled");
        }

        // Restore book stock
        for (const orderBook of order.books) {
          await tx.book.update({
            where: { bookID: orderBook.bookID },
            data: {
              stockQuantity: {
                increment: orderBook.quantity,
              },
              soldNumber: {
                decrement: orderBook.quantity,
              },
            },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { orderID: id },
          data: { status: OrderStatus.canceled },
          include: {
            user: {
              include: {
                authentication: true,
              },
            },
            books: {
              include: {
                book: {
                  include: {
                    images: true,
                  },
                },
              },
            },
            payment: true,
          },
        });

        return this.formatOrderResponse(updatedOrder);
      });
    } catch (error) {
      console.error(`Error canceling order ${id}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to cancel order");
    }
  },

  // FORMAT ORDER RESPONSE
  formatOrderResponse(order: any): OrderResponse {
    const items: OrderItemResponse[] = order.books.map((orderBook: any) => ({
      bookID: orderBook.bookID,
      bookTitle: orderBook.book.title,
      bookImage: orderBook.book.images[0]?.url,
      priceAtTime: Number(orderBook.priceAtTime),
      quantity: orderBook.quantity,
      subTotal: Number(orderBook.subTotal),
    }));

    return {
      orderID: order.orderID,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      addressSnapshot: order.addressSnapshot,
      phoneSnapshot: order.phoneSnapshot,
      userID: order.userID,
      items,
      payment: order.payment,
    };
  },

  // GET ORDER STATISTICS
  async getOrderStatistics(userID?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    try {
      const where: Prisma.OrderWhereInput = {};
      if (userID) {
        where.userID = userID;
      }

      const [totalOrders, pendingOrders, completedOrders, revenueResult] =
        await Promise.all([
          prisma.order.count({ where }),
          prisma.order.count({
            where: { ...where, status: OrderStatus.pending },
          }),
          prisma.order.count({
            where: { ...where, status: OrderStatus.completed },
          }),
          prisma.order.aggregate({
            where: { ...where, status: OrderStatus.completed },
            _sum: { totalAmount: true },
          }),
        ]);

      return {
        totalOrders,
        totalRevenue: Number(revenueResult._sum.totalAmount) || 0,
        pendingOrders,
        completedOrders,
      };
    } catch (error) {
      console.error("Error getting order statistics:", error);
      throw new Error("Failed to get order statistics");
    }
  },
};
