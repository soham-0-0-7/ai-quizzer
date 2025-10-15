import { Router } from "express";
import { submitQuiz } from "../controllers/submissionControllers.ts";

const router = Router();
router.post("/submit", submitQuiz);

export default router;
