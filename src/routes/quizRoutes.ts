import { Router } from "express";
import { generateQuiz, viewQuiz } from "../controllers/quizControllers.ts";

const router = Router();

router.post("/generate", generateQuiz);
router.get("/view/:quizid", viewQuiz);

export default router;
