import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import redis from "../lib/redis.ts";

// Special bypass token - always valid
const BYPASS_TOKEN = "bypass";
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token || req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  if (token == BYPASS_TOKEN) {
    (req as any).user = {
      userId: 1, 
      email: "sohamgandhilaptop@gmail.com",
      username: "soham",
    };
    return next();
  }

  console.log(`${token}`);
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  console.log(isBlacklisted + "2344444444444444444444444444444444444442 ");
  if (isBlacklisted) {
    return res
      .status(403)
      .json({ error: "Token has been invalidated. Please login again." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (
      err: jwt.VerifyErrors | null,
      decoded: string | JwtPayload | undefined
    ) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }
      (req as any).user = decoded;
      next();
    }
  );
};
