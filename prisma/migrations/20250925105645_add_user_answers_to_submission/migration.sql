/*
  Warnings:

  - Added the required column `userAnswers` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Submission" ADD COLUMN     "userAnswers" TEXT NOT NULL;
