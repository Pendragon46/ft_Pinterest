/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Artwork` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `Artwork` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artwork" DROP COLUMN "imageUrl",
DROP COLUMN "publicId",
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "mediapublicId" TEXT;
