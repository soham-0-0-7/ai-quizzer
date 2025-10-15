import ai from "../lib/gemini.ts";
import prisma from "../lib/db.ts";
import { getQuizFromCache } from "./quizCacheService.ts";
import { getAllSubmissionsService } from "./dashboardServices.ts";
import redis from "../lib/redis.ts";
import type { Request } from "express";

function stripContentBetweenBraces(text: string): string {
  const firstBraceIndex = text.indexOf("{");

  const lastBraceIndex = text.lastIndexOf("}");

  if (
    firstBraceIndex !== -1 &&
    lastBraceIndex !== -1 &&
    firstBraceIndex < lastBraceIndex
  ) {
    return text.substring(firstBraceIndex - 1, lastBraceIndex + 1);
  }

  return text;
}

export const generateQuizService = async (
  quizParams: {
    grade: number;
    Subject: string;
    TotalQuestions: number;
    MaxScore: number;
    Difficulty: string;
  },
  req: Request
) => {
  if (quizParams.TotalQuestions <= 0 || quizParams.MaxScore <= 0) {
    throw new Error("TotalQuestions and MaxScore must be greater than zero.");
  }
  if (quizParams.TotalQuestions > 20) {
    throw new Error("TotalQuestions must not exceed 20.");
  }
  if (quizParams.grade < 1 || quizParams.grade > 12) {
    throw new Error("Grade must be between 1 and 12.");
  }

  const userId = (req as any).user?.userId;
  if (!userId) throw new Error("User ID not found in request context");

  const relevantSubmissions = await getAllSubmissionsService(userId);

  // const relevantSubmissionsJson = JSON.stringify(relevantSubmissions);

  const filteredSubmissions = relevantSubmissions.filter(
    (sub: any) =>
      sub.grade == quizParams.grade.toString() &&
      sub.subject.toLowerCase() == quizParams.Subject.toLowerCase()
  );

  const prompt = `
        Generate a quiz in JSON format with the following parameters:
         Grade: ${quizParams.grade}
        Subject: ${quizParams.Subject}
        Total Questions: ${quizParams.TotalQuestions}
        Max Score: ${quizParams.MaxScore}
        Difficulty: ${quizParams.Difficulty}

        Previous submissions for this grade and subject (if any):
        ${
          filteredSubmissions.length > 0
            ? JSON.stringify(filteredSubmissions)
            : "None"
        }
        // ...add your custom prompt here...
        The response format should be:
        {
          questions : "---Q1--- ~ ---Q2---- ~ .... so on",
          options : " option a _ option b _ option c _ option d ~ ..... and so on",
          correct : "option b ~ ... and so on"
          points : " 1st q points ~ 2nd q points ~ and so on...",
          difficulty : "difficulty q1 ~ difficulty q2 ~ and so on..."
        }
          the number of options is not tightly fixed but try to keep it in a range of 2-6. keep the points distributed.
          And please remember it should be a strict json response only as this reponse will go in json.parse and the string would be converted to json.
          Give me a adapthive quiz according to the user's past perfomances if there are any attached above..
          balance easy/medium/hard 
          questions based on past performance from stored quiz history (if 
          available)
          AND PLEASE STRICTLY TAKE A NOTE OF THE POINTS BELOW...
          Critical note : never use ~ for anything other than seperation... if you want to 
          symbolize approximation anywhere use (approximately) = just dont use ~ for anything other than seperation
          Also never use _ for anything other than seperation of options in the options field
          as using it might cause formatting issues ahead as same with ~  

          I should not face the below error -
          Quiz response is not valid JSON: json\n{\n  \"questions\": \".....
          as I would be using the function JSON.parse(); afterwards so kindly strip off
          the backslash n  or backslash" or any unnecessary things like json\n{\n  ... etc}
          remember I am not sending this request through the gemini ui but amusing a gemini api key
          to send the request programattically...
           Do not include any escape characters like backslash n for new line or start with json and give the json reponse in bash with three apastrophes.... just plain text
          starting with { questions : "........." , options : "......" , correct : "......." , ... and so on } please....

         your response must always start with { and end with } only... no pre or post text outside json object
          `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${prompt}`,
    // config: {
    //   thinkingConfig: {
    //     thinkingBudget: 0, // Disables thinking
    //   },
    // },
  });

  console.log("Gemini API response status:", response);

  if (!response) {
    throw new Error("Failed to fetch quiz from Gemini API");
  }

  let quizString = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  quizString = stripContentBetweenBraces(quizString);

  let quizJson;
  try {
    quizJson = JSON.parse(quizString);
  } catch (err) {
    throw new Error(
      "Quiz response is not valid JSON: " + (quizString || "<empty response>")
    );
  }

  console.log(
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" +
      filteredSubmissions
  );

  // Split fields into arrays
  const qarray = (quizJson.questions || "")
    .split("~")
    .map((q: string) => q.trim());
  const oarray = (quizJson.options || "")
    .split("~")
    .map((o: string) => o.trim());
  const carray = (quizJson.correct || "")
    .split("~")
    .map((c: string) => c.trim());
  const parray = (quizJson.points || "")
    .split("~")
    .map((p: string) => p.trim());
  const darray = (quizJson.difficulty || "")
    .split("~")
    .map((d: string) => d.trim());

  const oarray_formatted = oarray.map((optStr: string) => {
    const options = optStr
      .split("_")
      .map((opt: string) => opt.trim())
      .filter(Boolean);
    return options.map((opt, idx) => `${idx + 1}. ${opt}`).join(", ");
  });

  const quizRecord = await prisma.quiz.create({
    data: {
      userId,
      totalPoints: parray.reduce(
        (sum: number, p: string) => sum + (parseFloat(p) || 0),
        0
      ),
      difficulty: quizParams.Difficulty,
      subject: quizParams.Subject,
      grade: quizParams.grade.toString(), // <-- Set grade here
    },
  });

  for (let i = 0; i < qarray.length; i++) {
    await prisma.question.create({
      data: {
        quizId: quizRecord.id,
        problem: qarray[i],
        options: oarray_formatted[i],
        correct: carray[i],
        difficulty: darray[i],
        points: parseFloat(parray[i]) || 0,
      },
    });
  }

  //   const quiz = qarray.map((question: string, i: number) => ({
  //     question,
  //     options: oarray_formatted[i],
  //     diff: darray[i],
  //     points: parray[i],
  //   }));

  const cached = await redis.get(`user:${userId}:quizzes`);
  let quizzesArr: any[] = [];
  if (cached) {
    try {
      quizzesArr = typeof cached === "string" ? JSON.parse(cached) : cached;
    } catch {
      quizzesArr = [];
    }
  }

  const newQuiz = await prisma.quiz.findUnique({
    where: { id: quizRecord.id },
    include: { questions: true },
  });

  const formattedQuiz = {
    quizId: newQuiz?.id,
    subject: newQuiz?.subject,
    difficulty: newQuiz?.difficulty,
    grade: newQuiz?.grade,
    totalPoints: newQuiz?.totalPoints,
    createdOn: newQuiz?.createdOn,
    questions: newQuiz?.questions.map((q: any) => ({
      id: q.id,
      problem: q.problem,
      options: q.options,
      correct: q.correct,
      difficulty: q.difficulty,
      points: q.points,
    })),
  };

  quizzesArr.push(formattedQuiz);
  await redis.set(`user:${userId}:quizzes`, JSON.stringify(quizzesArr), {
    ex: 3600,
  });

  return {
    message: `quiz generated successfully with id ${quizRecord.id}, send get req to /quiz/view/${quizRecord.id}`,
  };
};

export interface QuizQuestion {
  id: number;
  problem: string;
  options: string;
  points: number;
}

export interface ViewQuizResponse {
  instructions: string;
  questions: QuizQuestion[];
}
export const viewQuizService = async (quizid: number, userId: number) => {
  // Fetch quiz from cache
  const quiz = await getQuizFromCache(userId, quizid);
  if (!quiz) throw new Error("Quiz not found / does not belong to you.");

  // Ownership check: quiz.userId must match userId
  // if (quiz.userId != userId) {
  //   console.log(quiz.userId + " _" + userId);

  //   throw new Error("You do not own this quiz.");
  // }

  const questions = quiz.questions.map((q: any) => ({
    id: q.id,
    problem: q.problem,
    options: q.options,
    points: q.points,
  }));

  if (!questions.length) {
    throw new Error("Quiz has no questions.");
  }

  return {
    instructions:
      "to get hint for a question, send get req to /question/hint/[questionid], total points of the quiz are " +
      questions
        .reduce((sum: number, q: QuizQuestion) => sum + q.points, 0)
        .toString(),
    grade: quiz.grade,
    subject: quiz.subject,
    difficulty: quiz.difficulty,
    questions,
  } as ViewQuizResponse & {
    grade: string;
    subject: string;
    difficulty: string;
  };
};
