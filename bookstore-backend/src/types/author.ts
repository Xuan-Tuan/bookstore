import { Author, Authentication, Book } from "@prisma/client";

export interface AuthorWithRelations extends Author {
  authentication: Authentication;
  books: AuthorBookWithBook[];
}

export interface AuthorBookWithBook {
  book: Book;
}

export interface AuthorCreateInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthorUpdateInput {
  name?: string;
}

export interface AuthorFilters {
  search?: string;
  name?: string;
  email?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
