-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "profiles"
ADD COLUMN "status" "ProfileStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_audit_logs" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "roleBefore" "UserRole" NOT NULL,
    "roleAfter" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profiles_status_createdAt_idx" ON "profiles"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_audit_logs_targetUserId_createdAt_idx" ON "user_audit_logs"("targetUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_audit_logs_actorUserId_createdAt_idx" ON "user_audit_logs"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_audit_logs_createdAt_idx" ON "user_audit_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
