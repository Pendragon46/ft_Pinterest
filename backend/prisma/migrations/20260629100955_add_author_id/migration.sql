/*
  Warnings:

  - Added the required column `PublicId` to the `Artwork` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "PublicId" TEXT NOT NULL;
