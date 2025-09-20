import { Address, User } from "@prisma/client";

export interface AddressWithRelations extends Address {
  user: User;
}

export interface AddressCreateInput {
  userID: string;
  city: string;
  ward: string;
  specificAddress?: string;
}

export interface AddressUpdateInput {
  city?: string;
  ward?: string;
  specificAddress?: string;
}

export interface AddressFilters {
  userID?: string;
  city?: string;
  ward?: string;
}
