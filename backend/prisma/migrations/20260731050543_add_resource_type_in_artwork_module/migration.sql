-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "resourceType" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'USER',
ADD COLUMN     "systemKey" TEXT,
ALTER COLUMN "senderId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Artwork_authorId_idx" ON "Artwork"("authorId");

-- CreateIndex
CREATE INDEX "Artwork_createdAt_idx" ON "Artwork"("createdAt");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");
