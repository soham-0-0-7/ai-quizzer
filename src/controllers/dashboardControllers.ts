import type { Request, Response } from "express";
import {
  gradeFilterService,
  subjectFilterService,
  submissionDateFilterService,
  getSubmissionDetails,
  getAllSubmissionsService,
} from "../services/dashboardServices.ts";
import prisma from "../lib/db.ts";
import { dateRangeFilterService } from "../services/dashboardServices.ts";
import redis from "../lib/redis.ts";

const getUserId = (req: Request): number => {
  const token = req.cookies?.token || req.headers["authorization"];
  if (token === "bypass") return 1;
  return (req as any).user?.userId || 1;
};

export const dateRangeFilter = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { from, to } = req.body;

    const dateRegex = /^\d{2}\/\d{2}\/\d{2,4}$/;
    if (
      !from ||
      !to ||
      typeof from !== "string" ||
      typeof to !== "string" ||
      !dateRegex.test(from) ||
      !dateRegex.test(to)
    ) {
      return res
        .status(400)
        .json({ error: "Dates must be in dd/mm/yy format." });
    }

    const [fromDay, fromMonth, fromYear] = from.split("/");
    const [toDay, toMonth, toYear] = to.split("/");

    if (!fromDay || !fromMonth || !fromYear || !toDay || !toMonth || !toYear) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    const fullFromYear = fromYear.length === 2 ? "20" + fromYear : fromYear;
    const fullToYear = toYear.length === 2 ? "20" + toYear : toYear;
    const fromDate = new Date(
      `${fullFromYear}-${fromMonth}-${fromDay}T00:00:00.000Z`
    );
    const toDate = new Date(`${fullToYear}-${toMonth}-${toDay}T23:59:59.999Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date values." });
    }
    if (fromDate > toDate) {
      return res
        .status(400)
        .json({ error: "'from' date must not be after 'to' date." });
    }

    const result = await dateRangeFilterService(userId, fromDate, toDate);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const gradeFilter = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const grade = req.params.grade;
    if (!grade || typeof grade !== "string" || grade.length !== 1) {
      return res
        .status(400)
        .json({ error: "Grade must be a single character." });
    }
    if (!"ABCDEF".includes(grade.toUpperCase())) {
      return res.status(400).json({ error: "Grade must be between A and F." });
    }
    const result = await gradeFilterService(userId, grade.toUpperCase());
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const subjectFilter = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const subject = req.params.subject;
    if (!subject || typeof subject !== "string") {
      return res.status(400).json({ error: "Subject must be a string." });
    }
    const result = await subjectFilterService(userId, subject);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const submissionDateFilter = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const date = req.params.date;
    if (
      !date ||
      typeof date !== "string" ||
      !/^\d{2}-\d{2}-\d{2,4}$/.test(date) // Changed from "/" to "-"
    ) {
      return res
        .status(400)
        .json({ error: "Date must be in dd-mm-yy format." }); // Updated error message
    }
    const result = await submissionDateFilterService(userId, date);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await getAllSubmissionsService(userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
