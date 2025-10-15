import { Router } from "express";
import {
  gradeFilter,
  subjectFilter,
  submissionDateFilter,
  getAllSubmissions,
  dateRangeFilter,
} from "../controllers/dashboardControllers.ts";

const router = Router();

router.get("/gradeFilter/:grade", gradeFilter);

router.get("/subjectFilter/:subject", subjectFilter);

router.get("/submissionDateFilter/:date", submissionDateFilter);

router.get("/getAllSubmissions", getAllSubmissions);

router.post("/dateRangeFilter", dateRangeFilter);

export default router;
