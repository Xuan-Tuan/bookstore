import { Review, Book, User } from "@prisma/client";

export interface ReviewWithRelations extends Review {
  book: Book;
  user: User;
}

export interface ReviewCreateInput {
  userID: string;
  bookID: string;
  rating: number;
  cmt?: string;
}

export interface ReviewUpdateInput {
  rating?: number;
  cmt?: string;
}

export interface ReviewFilters {
  userID?: string;
  bookID?: string;
  rating?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
