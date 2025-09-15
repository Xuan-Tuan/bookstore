import { User, Authentication, Address, Gender, Role } from "@prisma/client";

export interface UserWithRelations extends User {
  authentication: Authentication;
  addresses: Address[];
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender?: Gender;
  birthDate?: Date | null;
}

export interface UserUpdateInput {
  name?: string;
  phone?: string;
  gender?: Gender;
  birthDate?: Date | null;
}

export interface UserFilters {
  search?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  role?: Role;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
