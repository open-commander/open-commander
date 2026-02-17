-- CreateEnum
CREATE TYPE "SessionRelationType" AS ENUM ('fork', 'stack');

-- AlterTable
ALTER TABLE "terminal_sessions" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "terminal_sessions" ADD COLUMN "relation_type" "SessionRelationType";

-- CreateIndex
CREATE INDEX "terminal_sessions_parent_id_idx" ON "terminal_sessions"("parent_id");

-- AddForeignKey
ALTER TABLE "terminal_sessions" ADD CONSTRAINT "terminal_sessions_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "terminal_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
