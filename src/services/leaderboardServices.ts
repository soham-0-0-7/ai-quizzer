import prisma from "../lib/db.ts";

function getPercentage(myScore: number, totalScore: number): number {
  if (!totalScore || totalScore == 0) return 0;
  return Math.round((myScore / totalScore) * 10000) / 100;
}

export const getLeaderboard = async (filter: {
  subject?: string;
  grade?: string;
}) => {
  const where: any = {};
  if (filter.subject) {
    const subject = filter.subject;
    const subjectWithS = subject.endsWith("s") ? subject : subject + "s";
    const subjectWithoutS = subject.endsWith("s")
      ? subject.slice(0, -1)
      : subject;

    where.OR = [
      { subject: { equals: subject, mode: "insensitive" } },
      { subject: { equals: subjectWithS, mode: "insensitive" } },
      { subject: { equals: subjectWithoutS, mode: "insensitive" } },
    ];
  }
  if (filter.grade) {
    where.grade = filter.grade;
  }

  // Fetch all matching submissions
  const submissions = await prisma.submission.findMany({
    where,
    orderBy: [{ myScore: "desc" }],
  });

  // Calculate percentage and sort
  const ranked = submissions
    .map((sub: any) => ({
      userId: sub.userId,
      submissionId: sub.id,
      subject: sub.subject,
      grade: sub.grade,
      myScore: sub.myScore,
      totalScore: sub.totalScore,
      percentage: getPercentage(sub.myScore, sub.totalScore),
      submittedOn: sub.submittedOn,
    }))
    .sort((a: any, b: any) => b.percentage - a.percentage)
    .slice(0, 10);

  return ranked;
};
