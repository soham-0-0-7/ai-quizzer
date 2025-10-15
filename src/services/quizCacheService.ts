import redis from "../lib/redis.ts";
import prisma from "../lib/db.ts";

export const getQuizFromCache = async (userId: number, quizId: number) => {
  const cached = await redis.get(`user:${userId}:quizzes`);
  console.log(`user:${userId}:quizzes`);
  console.log("cached quizzes:", cached);

  let quizzes;

  if (cached) {
    try {
      quizzes = typeof cached === "string" ? JSON.parse(cached) : cached;
      console.log(
        "entered the cache................................................."
      );

      const cachedQuiz = quizzes.find((quiz: any) => quiz.quizId == quizId);
      if (cachedQuiz) {
        return cachedQuiz;
      }
    } catch {
      console.log("Error parsing cached quizzes, falling back to database");
    }
  }

  // If not found in cache or cache is empty, fetch from database
  console.log("Quiz not found in cache, fetching from database...");

  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        userId: userId,
      },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      console.log("Quiz not found in database either");
      return null;
    }

    // Format the quiz data to match cache structure
    const formattedQuiz = {
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
    };

    // Update cache with the fetched quiz (and potentially other user quizzes)
    const allUserQuizzes = await prisma.quiz.findMany({
      where: { userId: userId },
      include: { questions: true },
      orderBy: { createdOn: "desc" },
    });

    const formattedQuizzes = allUserQuizzes.map((userQuiz: any) => ({
      quizId: userQuiz.id,
      subject: userQuiz.subject,
      difficulty: userQuiz.difficulty,
      grade: userQuiz.grade,
      totalPoints: userQuiz.totalPoints,
      createdOn: userQuiz.createdOn,
      userId: userQuiz.userId,
      questions: userQuiz.questions.map((q: any) => ({
        id: q.id,
        problem: q.problem,
        options: q.options,
        correct: q.correct,
        difficulty: q.difficulty,
        points: q.points,
      })),
    }));

    // Cache all user quizzes for 1 hour
    await redis.set(
      `user:${userId}:quizzes`,
      JSON.stringify(formattedQuizzes),
      {
        ex: 3600,
      }
    );

    console.log("Quiz fetched from database and cached successfully");
    return formattedQuiz;
  } catch (error) {
    console.error("Error fetching quiz from database:", error);
    return null;
  }
};
