/*
  Warnings:

  - You are about to drop the column `PublicId` on the `Artwork` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artwork" DROP COLUMN "PublicId",
ADD COLUMN     "publicId" TEXT;
