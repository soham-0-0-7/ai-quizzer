import type { Request, Response } from "express";
import { getHintService } from "../services/questionServices.ts";

export const getHint = async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionid ?? "", 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }
    const result = await getHintService(questionId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
