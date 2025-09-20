import { Wishlist, Book, User } from "@prisma/client";

export interface WishlistWithRelations extends Wishlist {
  book: Book;
  user: User;
}

export interface WishlistCreateInput {
  userID: string;
  bookID: string;
}

export interface WishlistFilters {
  userID?: string;
  bookID?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
