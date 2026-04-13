-- AlterTable
ALTER TABLE "TutorSettings" ADD COLUMN     "google_sheets_file_id" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "google_token_expiry" TIMESTAMP(3);
