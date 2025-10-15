import prisma from "../lib/db.ts";
import { getQuizFromCache } from "./quizCacheService.ts";


export function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}
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
export async function getSubmissionDetails(submission: any) {
  const quiz = await getQuizFromCache(submission.userId, submission.quizId);
  return {
    submissionId: submission.id,
    submittedOn: formatDate(submission.submittedOn),
    gradepoint: submission.gradepoint, // <-- renamed
    grade: submission.grade, // <-- new field
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
export const gradeFilterService = async (userId: number, grade: string) => {
  const submissions = await prisma.submission.findMany({
    where: { userId, gradepoint: { equals: grade, mode: "insensitive" } },
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
  const safeYear = year ?? "";
  const fullYear = safeYear.length === 2 ? "20" + safeYear : safeYear;
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

export const getAllSubmissionsService = async (userId: number) => {
  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { submittedOn: "desc" },
  });
  return Promise.all(submissions.map(getSubmissionDetails));
};
