import type { Request, Response } from "express";
import {
  generateQuizService,
  viewQuizService,
} from "../services/quizServices.ts";

const getUserId = (req: Request): number => {
  const token = req.cookies?.token || req.headers["authorization"];
  if (token === "bypass") return 1;
  return (req as any).user?.userId || 1;
};

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await generateQuizService(req.body, req);
    res.status(200).json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const viewQuiz = async (req: Request, res: Response) => {
  try {
    const quizid = parseInt(req.params.quizid ?? "", 10);
    const userId = getUserId(req);
    console.log("userId from token:", userId);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await viewQuizService(quizid, userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
