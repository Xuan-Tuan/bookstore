export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: "user" | "author" | "admin";
  phone?: string;
  gender?: "male" | "female" | "other";
  birthDate?: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatar?: string;
    };
  };
}

export interface JwtPayload {
  authID: string;
  email: string;
  role: string;
  userID?: string;
  authorID?: string;
  adminID?: string;
  iat?: number;
  exp?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  name: string;
  phone?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: Date | null;
  registerDate?: Date;
  addresses?: any[];
}
