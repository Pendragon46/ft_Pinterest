/*
  Warnings:

  - Made the column `avatarUrl` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatarUrl" SET NOT NULL,
ALTER COLUMN "avatarUrl" SET DEFAULT 'https://res.cloudinary.com/dqerznri9/image/upload/v1782971286/Default_avatar_bnkyia.png';
