import { Router } from "express";
import { leaderboard } from "../controllers/leaderboardControllers.ts";

const router = Router();

router.get("/", leaderboard);

export default router;
