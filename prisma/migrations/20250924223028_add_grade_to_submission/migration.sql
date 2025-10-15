/*
  Warnings:

  - You are about to drop the column `score` on the `Submission` table. All the data in the column will be lost.
  - Added the required column `grade` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `myScore` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalScore` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Submission" DROP COLUMN "score",
ADD COLUMN     "grade" TEXT NOT NULL,
ADD COLUMN     "myScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalScore" DOUBLE PRECISION NOT NULL;
