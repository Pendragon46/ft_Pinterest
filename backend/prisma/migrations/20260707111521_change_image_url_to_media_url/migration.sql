/*
  Warnings:

  - You are about to drop the column `mediapublicId` on the `Artwork` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artwork" DROP COLUMN "mediapublicId",
ADD COLUMN     "mediaPublicId" TEXT;
