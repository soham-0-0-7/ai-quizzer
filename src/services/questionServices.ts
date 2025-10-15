import prisma from "../lib/db.ts";
import ai from "../lib/gemini.ts";

export const getHintService = async (questionId: number) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { problem: true, options: true, difficulty: true },
  });

  if (!question) throw new Error("Question not found");

  const prompt = `
    You are an expert teacher. Give a single-line hint to help a student answer the following question, but do NOT give the direct answer or reveal the correct option. Only provide a relevant hint.
    Question: ${question.problem}
    Options: ${question.options}
    Difficulty: ${question.difficulty}
    Only return the hint as plain text, no extra explanation or formatting.
  `;

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const hint =
    aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "No hint available.";

  return { question: question.problem, hint };
};
