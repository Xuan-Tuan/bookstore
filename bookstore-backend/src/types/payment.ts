import { Payment, Order, PaymentStatus, PaymentMethod } from "@prisma/client";

export interface PaymentWithRelations extends Payment {
  order: Order;
}

export interface PaymentCreateInput {
  orderID: string;
  method: PaymentMethod;
  amount: number;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  paidAt?: Date;
}

export interface PaymentFilters {
  orderID?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaymentResponse {
  paymentID: string;
  orderID: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  paidAt?: Date;
  order: {
    orderID: string;
    status: string;
    totalAmount: number;
    userID: string;
  };
}
