import prisma from "../lib/db.ts";
import ai from "../lib/gemini.ts";
import { getQuizFromCache } from "./quizCacheService.ts";
import nodemailer from "nodemailer";

function stripContentBetweenBraces(text: string): string {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && first < last) {
    return text.substring(first, last + 1);
  }
  return text;
}

export function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export const submitQuizService = async (
  submission: {
    quizId: number;
    responses: { questionId: number; userResponse: string }[];
  },
  userId: number,
  req?: any
) => {
  const quizId =
    typeof submission.quizId === "string"
      ? parseInt(submission.quizId, 10)
      : submission.quizId;

  const quiz = await getQuizFromCache(userId, submission.quizId);
  if (!quiz) throw new Error("Quiz not found in cache.");

  const answerKey = quiz.questions.map((q: any) => ({
    questionId: q.id,
    problem: q.problem,
    options: q.options,
    correct: q.correct,
    points: q.points,
    difficulty: q.difficulty,
  }));

  const answerSheet = submission.responses;

  const prompt = `
    Evaluate the following quiz submission.
    Answer Key: ${JSON.stringify(answerKey)} 
    ------------------------------------------------------------------
    Answer Attempted By Me: ${JSON.stringify(answerSheet)}

    Return ONLY a JSON object in this format:
    {
      evaluation: [{ question: "...", "my-answer": "...", "correct-answer": "...", "points-scored": "2/5" }, ...],
      "your-score": ...,
      "max-marks": ...,
      suggestions: "1. .... , 2. ....",
      grade: "A|B|C|D|E|F"
    }
  `;

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let aiResult: any;
  try {
    aiResult = JSON.parse(
      stripContentBetweenBraces(
        aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
      )
    );
  } catch {
    aiResult = {
      evaluation: [],
      "your-score": 0,
      "max-marks": quiz.questions.reduce(
        (sum: number, q: any) =>
          sum +
          (typeof q.points === "string" ? parseFloat(q.points) : q.points),
        0
      ),
      suggestions: "No suggestions available.",
      grade: "F",
    };
  }

  const questionPointsArr: number[] = [];
  if (Array.isArray(aiResult.evaluation)) {
    for (const e of aiResult.evaluation) {
      if (e["points-scored"]) {
        const [scored] = e["points-scored"].split("/");
        questionPointsArr.push(parseInt(scored, 10) || 0);
      }
    }
  }

  const myScore = aiResult["your-score"] ?? 0;

  const tries = await prisma.submission.count({
    where: { userId, quizId },
  });

  const userAnswersString = submission.responses
    .map((resp) => resp.userResponse.trim().toUpperCase())
    .join(" ~ ");
  const questionPointsString = questionPointsArr.join(" ~ ");

  await prisma.submission.create({
    data: {
      userId,
      quizId,
      totalScore: quiz.questions.reduce(
        (sum: number, q: any) =>
          sum +
          (typeof q.points === "string" ? parseFloat(q.points) : q.points),
        0
      ),
      myScore,
      subject: quiz.subject as string,
      gradepoint: aiResult.grade ?? getGrade(myScore, quiz.questions),
      grade: quiz.grade ?? "",
      tries: tries + 1,
      suggestions: aiResult.suggestions ?? "",
      userAnswers: userAnswersString,
      questionPoints: questionPointsString,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Quiz Submission Result",
      text: JSON.stringify(aiResult, null, 2),
    });
  }

  return aiResult;
};

function getGrade(score: number, questions: any[]): string {
  const total = questions.reduce(
    (sum, q) =>
      sum + (typeof q.points === "string" ? parseFloat(q.points) : q.points),
    0
  );
  const percent = total ? (score / total) * 100 : 0;
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  if (percent >= 50) return "E";
  return "F";
}

export async function getSubmissionDetails(submission: any) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: submission.quizId },
    include: { questions: true },
  });
  return {
    submissionId: submission.id,
    submittedOn: formatDate(submission.submittedOn),
    grade: submission.grade,
    subject: submission.subject,
    myScore: submission.myScore,
    totalScore: submission.totalScore,
    suggestions: submission.suggestions,
    userAnswers: submission.userAnswers,
    questionPoints: submission.questionPoints,
    quiz: quiz
      ? quiz.questions.map((q: any) => ({
          id: q.id,
          problem: q.problem,
          options: q.options,
          points: q.points,
        }))
      : [],
  };
}

export const getAllSubmissionsService = async (userId: number) => {
  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};

export const gradeFilterService = async (userId: number, grade: string) => {
  const submissions = await prisma.submission.findMany({
    where: { userId, grade },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};

export const subjectFilterService = async (userId: number, subject: string) => {
  const submissions = await prisma.submission.findMany({
    where: { userId, subject: { equals: subject, mode: "insensitive" } },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};

export const submissionDateFilterService = async (
  userId: number,
  date: string
) => {
  const [day, month, year] = date.split("-");
  if (!day || !month || !year) {
    throw new Error("Invalid date format. Expected dd/mm/yy");
  }
  const fullYear = year.length === 2 ? "20" + year : year;
  const start = new Date(`${fullYear}-${month}-${day}T00:00:00.000Z`);
  const end = new Date(`${fullYear}-${month}-${day}T23:59:59.999Z`);

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      submittedOn: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};

export const dateRangeFilterService = async (
  userId: number,
  fromDate: Date,
  toDate: Date
) => {
  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      submittedOn: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};
