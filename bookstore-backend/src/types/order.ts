import {
  Order,
  OrderBook,
  Book,
  User,
  Payment,
  OrderStatus,
} from "@prisma/client";

export interface OrderWithRelations extends Order {
  user: User;
  books: OrderBookWithBook[];
  payment?: Payment;
}

export interface OrderBookWithBook extends OrderBook {
  book: Book;
}

export interface OrderCreateInput {
  userID: string;
  addressID: string;
  phone: string;
  items: OrderItemInput[];
}

export interface OrderItemInput {
  bookID: string;
  quantity: number;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
}

export interface OrderFilters {
  userID?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface OrderResponse {
  orderID: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  addressSnapshot: string;
  phoneSnapshot: string;
  userID: string;
  items: OrderItemResponse[];
  payment?: Payment;
}

export interface OrderItemResponse {
  bookID: string;
  bookTitle: string;
  bookImage?: string;
  priceAtTime: number;
  quantity: number;
  subTotal: number;
}
