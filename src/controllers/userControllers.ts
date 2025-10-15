import type { Request, Response } from "express";
import {
  signupService,
  loginService,
  logoutService,
} from "../services/userServices.ts";

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "Email, username, and password are required" });
    }
    const result = await signupService(email, username, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    if (!password || (!email && !username)) {
      return res
        .status(400)
        .json({ error: "Password and either email or username are required" });
    }
    const result = await loginService(email, username, password);
    // Set JWT as HTTP-only cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // use true in production
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.status(200).json({ message: result.message, token: result.token });
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
    const authorizationHeader =
      req.headers["authorization"] || req.cookies?.token;
    const result = await logoutService(authorizationHeader);
    res.clearCookie("token"); // Remove cookie from client
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Unauthorized" });
  }
};
