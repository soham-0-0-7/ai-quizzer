import type { Request, Response } from "express";
import { getLeaderboard } from "../services/leaderboardServices.ts";

export const leaderboard = async (req: Request, res: Response) => {
  try {
    const subject = req.query.subject;
    const grade = req.query.grade;

    if (!subject && !grade) {
      return res.status(400).json({
        error: "Provide at least subject or grade as query parameters.",
      });
    }
    if (subject && typeof subject !== "string") {
      return res.status(400).json({ error: "Subject must be a string." });
    }
    if (grade && typeof grade !== "string") {
      return res.status(400).json({ error: "Grade must be a string." });
    }

    const params: { subject?: string; grade?: string } = {};
    if (subject) params.subject = subject as string;
    if (grade) params.grade = grade as string;
    const result = await getLeaderboard(params);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
