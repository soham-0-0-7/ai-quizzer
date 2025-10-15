import express from "express";
import userRoutes from "./routes/userRoutes.ts";
import quizRoutes from "./routes/quizRoutes.ts";
import { authenticateToken } from "./middlewares/authenticateToken.ts";
import submissionRoutes from "./routes/submissionRoutes.ts";
import questionRoutes from "./routes/questionRoutes.ts";
import dashboardRoutes from "./routes/dashboardRoutes.ts";
import leaderboardRoutes from "./routes/leaderboardRoutes.ts";
import cookieParser from "cookie-parser";

const app = express();
app.use(cookieParser());

app.use(express.json());
app.use("/user", userRoutes);
app.use("/quiz", authenticateToken, quizRoutes);
app.use("/submission", authenticateToken, submissionRoutes);
app.use("/dashboard", authenticateToken, dashboardRoutes);
app.use("/leaderboard",authenticateToken, leaderboardRoutes);
app.use("/question",authenticateToken, questionRoutes);

export default app;
