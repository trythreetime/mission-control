-- AlterTable
ALTER TABLE "user_audit_logs"
  ALTER COLUMN "roleBefore" DROP NOT NULL,
  ALTER COLUMN "roleAfter" DROP NOT NULL,
  ADD COLUMN "statusBefore" "ProfileStatus",
  ADD COLUMN "statusAfter" "ProfileStatus";
