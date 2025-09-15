import { Book, Genre, Author, BookImage } from "@prisma/client";

export interface BookWithRelations extends Book {
  genre?: Genre;
  images: BookImage[];
  authors: AuthorBookWithAuthor[];
}

export interface AuthorBookWithAuthor {
  author: Author;
}

export interface BookCreateInput {
  title: string;
  price: number;
  description?: string;
  stockQuantity: number;
  pubTime?: Date | null;
  genreID?: string;
  authorIDs?: string[];
  images?: string[];
}

export interface BookUpdateInput {
  title?: string;
  price?: number;
  description?: string;
  stockQuantity?: number;
  soldNumber?: number;
  pubTime?: Date | null;
  genreID?: string;
  authorIDs?: string[];
  images?: string[];
}
