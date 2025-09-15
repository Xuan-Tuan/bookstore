import { Request, Response, NextFunction } from "express";
import { body, validationResult, ValidationChain } from "express-validator";

// Validation rules for book creation
export const validateBook: ValidationChain[] = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),

  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),

  body("stockQuantity")
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be non-negative"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),

  body("genreID")
    .optional()
    .isUUID()
    .withMessage("GenreID must be a valid UUID"),

  body("authorIDs")
    .optional()
    .isArray()
    .withMessage("AuthorIDs must be an array"),

  body("authorIDs.*")
    .optional()
    .isUUID()
    .withMessage("Each authorID must be a valid UUID"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*")
    .optional()
    .isURL()
    .withMessage("Each image must be a valid URL"),
];

// Validation rules for book update (có thể optional các field)
export const validateBookUpdate: ValidationChain[] = [
  body("title")
    .optional()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),

  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be greater than 0"),

  body("stockQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be non-negative"),

  body("soldNumber")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Sold number must be non-negative"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),

  body("genreID")
    .optional()
    .isUUID()
    .withMessage("GenreID must be a valid UUID"),

  body("authorIDs")
    .optional()
    .isArray()
    .withMessage("AuthorIDs must be an array"),

  body("authorIDs.*")
    .optional()
    .isUUID()
    .withMessage("Each authorID must be a valid UUID"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*")
    .optional()
    .isURL()
    .withMessage("Each image must be a valid URL"),
];

// Middleware to check validation results
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
    return;
  }

  next();
};
