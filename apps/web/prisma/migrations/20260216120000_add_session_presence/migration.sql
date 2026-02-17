-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('active', 'viewing', 'inactive');

-- CreateTable
CREATE TABLE "session_presences" (
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'active',
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_presences_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "session_presences_session_id_idx" ON "session_presences"("session_id");

-- AddForeignKey
ALTER TABLE "session_presences" ADD CONSTRAINT "session_presences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_presences" ADD CONSTRAINT "session_presences_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "terminal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
