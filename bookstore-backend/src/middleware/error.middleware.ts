import { Request, Response } from "express";
import { HTTP_STATUS, API_RESPONSE } from "../config/constants";

export interface CustomError extends Error {
  statusCode?: number;
  code?: string; // Prisma error codes are strings
}

/**
 * Centralized error handling middleware
 */
export const errorMiddleware = (
  error: CustomError,
  req: Request,
  res: Response
) => {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    console.error("🔴 Error:", error);
  }

  let statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = error.message || API_RESPONSE.INTERNAL_ERROR;

  // Prisma error handling
  switch (error.code) {
    case "P2002": // Unique constraint failed
      statusCode = HTTP_STATUS.CONFLICT;
      message = API_RESPONSE.CONFLICT;
      break;
    case "P2025": // Record not found
      statusCode = HTTP_STATUS.NOT_FOUND;
      message = API_RESPONSE.NOT_FOUND;
      break;
    case "P2003": // Foreign key constraint failed
    case "P2014": // Invalid relation error
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = API_RESPONSE.VALIDATION_ERROR;
      break;
    case "P2000": // Value too long for column
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = "Value too long for column";
      break;
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = API_RESPONSE.INVALID_TOKEN;
  }

  if (error.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Token expired";
  }

  // Validation errors
  if (error.name === "ValidationError") {
    statusCode = HTTP_STATUS.VALIDATION_ERROR;
    message = API_RESPONSE.VALIDATION_ERROR;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && {
      stack: error.stack,
      code: error.code,
    }),
  });
};
