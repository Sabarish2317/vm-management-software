/**
 * routes/auth.ts
 *
 * POST /api/auth/register  — create a new user account
 * POST /api/auth/login     — authenticate and receive a JWT
 * GET  /api/auth/me        — return current user info (protected)
 */
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";

const router: Router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message ?? "Validation error",
    });
    return;
  }

  const { email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ success: false, error: "Email already in use" });
    return;
  }

  const user = await User.create({ email, password });
  const token = signToken(String(user._id), user.email);

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, email: user.email },
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message ?? "Validation error",
    });
    return;
  }

  const { email, password } = parsed.data;

  // Must explicitly select password since it has select:false
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res
      .status(401)
      .json({ success: false, error: "Invalid email or password" });
    return;
  }

  const match = await user.comparePassword(password);
  if (!match) {
    res
      .status(401)
      .json({ success: false, error: "Invalid email or password" });
    return;
  }

  const token = signToken(String(user._id), user.email);

  res.json({
    success: true,
    token,
    user: { id: user._id, email: user.email },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req: Request, res: Response): void => {
  res.json({ success: true, user: req.user });
});

export default router;
