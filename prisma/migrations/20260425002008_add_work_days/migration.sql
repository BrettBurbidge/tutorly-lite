-- AlterTable
ALTER TABLE "TutorSettings" ADD COLUMN     "work_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[];
