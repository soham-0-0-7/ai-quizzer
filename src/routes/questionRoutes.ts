import { Router } from "express";
import { getHint } from "../controllers/questionControllers.ts";

const router = Router();
router.get("/hint/:questionid", getHint);

export default router;
