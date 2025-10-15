/*
  Warnings:

  - Added the required column `gradepoint` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Submission" ADD COLUMN     "gradepoint" TEXT NOT NULL;
