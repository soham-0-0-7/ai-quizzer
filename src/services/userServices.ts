import prisma from "../lib/db.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redis from "../lib/redis.ts";
import { getSubmissionDetails } from "../services/dashboardServices.ts";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signupService = async (
  email: string,
  username: string,
  password: string
) => {
  if (!email || !username || !password) {
    const error = new Error("Email, username, and password are required");
    (error as any).status = 400;
    throw error;
  }
  if (!emailRegex.test(email)) {
    const error = new Error("Invalid email format");
    (error as any).status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error("Password must be more than 8 characters");
    (error as any).status = 400;
    throw error;
  }

  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUserByEmail) {
    const error = new Error("Email already exists");
    (error as any).status = 409;
    throw error;
  }

  const existingUserByUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUserByUsername) {
    const error = new Error("Username already exists");
    (error as any).status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, username, password: hashedPassword },
  });

  return {
    message: "Successful account creation, please login on user/login.",
  };
};

export const loginService = async (
  email?: string,
  username?: string,
  password?: string
) => {
  if (!password || (!email && !username)) {
    const error = new Error(
      "Password and either email or username are required"
    );
    (error as any).status = 400;
    throw error;
  }
  if (email && !emailRegex.test(email)) {
    const error = new Error("Invalid email format");
    (error as any).status = 400;
    throw error;
  }

  let user;
  if (email && username) {
    user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.username !== username) {
      const error = new Error("Email and username do not match");
      (error as any).status = 401;
      throw error;
    }
  } else if (email) {
    user = await prisma.user.findUnique({ where: { email } });
  } else if (username) {
    user = await prisma.user.findUnique({ where: { username } });
  }

  if (!user) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  const quizzes = await prisma.quiz.findMany({
    where: { userId: user.id },
    include: { questions: true },
    orderBy: { createdOn: "desc" },
  });

  const formattedQuizzes = quizzes.map((quiz: any) => ({
    quizId: quiz.id,
    subject: quiz.subject,
    difficulty: quiz.difficulty,
    grade: quiz.grade,
    totalPoints: quiz.totalPoints,
    createdOn: quiz.createdOn,
    userId: quiz.userId,
    questions: quiz.questions.map((q: any) => ({
      id: q.id,
      problem: q.problem,
      options: q.options,
      correct: q.correct,
      difficulty: q.difficulty,
      points: q.points,
    })),
  }));

  await redis.set(`user:${user.id}:quizzes`, JSON.stringify(formattedQuizzes), {
    ex: 3600,
  });

  return {
    message: "Login successful, save the token for future requests.",
    token,
  };
};

export const logoutService = async (
  authorizationHeader: string | undefined
) => {
  if (!authorizationHeader) {
    throw new Error("No authorization header provided");
  }

  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : authorizationHeader;

  let userId: number | undefined;
  let exp: number | undefined;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    userId = decoded.userId;
    exp = decoded.exp;
  } catch {
    throw new Error("Invalid or expired token");
  }

  if (!userId) {
    throw new Error("User ID not found in token");
  }

  // Blacklist the token in Redis until its expiry
  if (exp) {
    const ttl = exp - Math.floor(Date.now() / 1000); // seconds until expiry
    await redis.set(`blacklist:${token}`, "true", { ex: ttl });
  }

  await redis.del(`user:${userId}:submissions`);
  await redis.del(`user:${userId}:quizzes`);
  return {
    message: "Successfully logged out, deleted cache, and invalidated token.",
  };
};
