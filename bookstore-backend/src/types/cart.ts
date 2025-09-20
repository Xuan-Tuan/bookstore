import { Cart, CartBook, Book, User } from "@prisma/client";

export interface CartWithRelations extends Cart {
  user: User;
  books: CartBookWithBook[];
}

export interface CartBookWithBook extends CartBook {
  book: Book;
}

export interface CartItemInput {
  bookID: string;
  quantity: number;
  isSelected?: boolean;
}

export interface UpdateCartItemInput {
  quantity?: number;
  isSelected?: boolean;
}

export interface CartResponse {
  cartID: string;
  userID: string;
  items: CartItemResponse[];
  totalItems: number;
  totalPrice: number;
}

export interface CartItemResponse {
  cartID: string;
  bookID: string;
  bookTitle: string;
  bookPrice: number;
  bookImage?: string;
  quantity: number;
  isSelected: boolean;
  addedAt: Date;
  subTotal: number;
}
