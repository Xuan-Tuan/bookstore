import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import {
  authenticateToken,
  validateRefreshToken,
  authRateLimit,
  middlewareGroups,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "Password123"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               role:
 *                 type: string
 *                 enum: [user, author, admin]
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  authRateLimit(3, "Too many registration attempts"), // Stricter limit for registration
  AuthController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/login",
  authRateLimit(5, "Too many login attempts"),
  AuthController.login
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/refresh-token",
  validateRefreshToken,
  AuthController.refreshToken
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: If email exists, reset link will be sent
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/forgot-password",
  authRateLimit(3, "Too many password reset requests"),
  AuthController.forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "NewPassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Invalid or expired token
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/reset-password", AuthController.resetPassword);

// ==================== PROTECTED ROUTES ====================

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/profile", middlewareGroups.protected, AuthController.getProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "NewPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Unauthorized or incorrect current password
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.put(
  "/change-password",
  middlewareGroups.protected,
  AuthController.changePassword
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify token validity
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Internal server error
 */
router.get("/verify", middlewareGroups.protected, AuthController.verifyToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Internal server error
 */
router.post("/logout", middlewareGroups.protected, AuthController.logout);

// ==================== PUBLIC UTILITY ROUTES ====================

/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: Get available user roles
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/roles", AuthController.getRoles);

/**
 * @swagger
 * /api/auth/check-email:
 *   get:
 *     summary: Check if email exists
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: Email check completed
 *       400:
 *         description: Email parameter is required
 *       500:
 *         description: Internal server error
 */
router.get("/check-email", AuthController.checkEmail);

/**
 * @swagger
 * /api/auth/health:
 *   get:
 *     summary: Authentication service health check
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication service is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
