/*
  Warnings:

  - Added the required column `subject` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Quiz" ADD COLUMN     "subject" TEXT NOT NULL;
