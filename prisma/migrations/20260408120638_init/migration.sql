-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IPAD', 'MACBOOK', 'CHROMEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "AppCategory" AS ENUM ('LMS', 'ASSESSMENT', 'COMMUNICATION', 'PRODUCTIVITY', 'CREATIVE', 'REFERENCE', 'SOCIAL_MEDIA', 'VIDEO', 'GAMING', 'UTILITY', 'SSO_IDP', 'CDN_INFRASTRUCTURE', 'ANALYTICS', 'ADVERTISING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'RESTRICTED', 'BLOCKED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DataCollectionLikelihood" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('APP', 'LOGIN', 'CDN', 'STATIC', 'API', 'TRACKING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IntegrationSourceType" AS ENUM ('DNS_LOG', 'BROWSER_TELEMETRY', 'SSO_LOG', 'LMS_LAUNCH', 'MDM_INVENTORY', 'CSV_UPLOAD', 'MANUAL_ENTRY', 'MOCK');

-- CreateEnum
CREATE TYPE "DataCategory" AS ENUM ('NAME', 'EMAIL', 'STUDENT_ID', 'CLASS_ENROLLMENT', 'ASSIGNMENT_CONTENT', 'BEHAVIORAL_ACTIVITY', 'DEVICE_IDENTIFIERS', 'LOCATION', 'PHOTOS', 'AUDIO_VIDEO', 'PARENT_CONTACT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "GradeLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "districtStudentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGradeLevel" (
    "studentId" TEXT NOT NULL,
    "gradeLevelId" TEXT NOT NULL,

    CONSTRAINT "StudentGradeLevel_pkey" PRIMARY KEY ("studentId","gradeLevelId")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "modelName" TEXT,
    "osVersion" TEXT,
    "mdmManaged" BOOLEAN NOT NULL DEFAULT true,
    "studentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "headquartersCountry" TEXT,
    "hasStudentPrivacyPolicy" BOOLEAN NOT NULL DEFAULT false,
    "coppaCompliant" BOOLEAN,
    "ferpaCompliant" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryDomain" TEXT NOT NULL,
    "vendorId" TEXT,
    "description" TEXT,
    "category" "AppCategory" NOT NULL DEFAULT 'UNKNOWN',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collectsData" "DataCollectionLikelihood" NOT NULL DEFAULT 'UNKNOWN',
    "dataConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3),
    "totalObservations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainAlias" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "webAppId" TEXT NOT NULL,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "domainType" "DomainType" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "domain" TEXT NOT NULL,
    "fullUrl" TEXT,
    "studentId" TEXT,
    "deviceId" TEXT,
    "schoolId" TEXT,
    "webAppId" TEXT,
    "sourceType" "IntegrationSourceType" NOT NULL,
    "rawData" JSONB,
    "sessionDurationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataCollectionSignal" (
    "id" TEXT NOT NULL,
    "webAppId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "IntegrationSourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataCollectionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAppDataCategory" (
    "webAppId" TEXT NOT NULL,
    "dataCategory" "DataCategory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT NOT NULL,

    CONSTRAINT "WebAppDataCategory_pkey" PRIMARY KEY ("webAppId","dataCategory")
);

-- CreateTable
CREATE TABLE "PrivacyReview" (
    "id" TEXT NOT NULL,
    "webAppId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "notes" TEXT,
    "riskAssessment" TEXT,
    "recommendedAction" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceArtifact" (
    "id" TEXT NOT NULL,
    "webAppId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "content" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_shortCode_key" ON "School"("shortCode");

-- CreateIndex
CREATE INDEX "School_shortCode_idx" ON "School"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "GradeLevel_name_key" ON "GradeLevel"("name");

-- CreateIndex
CREATE INDEX "GradeLevel_sortOrder_idx" ON "GradeLevel"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Student_districtStudentId_key" ON "Student"("districtStudentId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Student_districtStudentId_idx" ON "Student"("districtStudentId");

-- CreateIndex
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "StudentGradeLevel_gradeLevelId_idx" ON "StudentGradeLevel"("gradeLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_key" ON "Device"("serialNumber");

-- CreateIndex
CREATE INDEX "Device_serialNumber_idx" ON "Device"("serialNumber");

-- CreateIndex
CREATE INDEX "Device_schoolId_idx" ON "Device"("schoolId");

-- CreateIndex
CREATE INDEX "Device_studentId_idx" ON "Device"("studentId");

-- CreateIndex
CREATE INDEX "Device_deviceType_idx" ON "Device"("deviceType");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "WebApp_primaryDomain_idx" ON "WebApp"("primaryDomain");

-- CreateIndex
CREATE INDEX "WebApp_approvalStatus_idx" ON "WebApp"("approvalStatus");

-- CreateIndex
CREATE INDEX "WebApp_category_idx" ON "WebApp"("category");

-- CreateIndex
CREATE INDEX "WebApp_vendorId_idx" ON "WebApp"("vendorId");

-- CreateIndex
CREATE INDEX "WebApp_riskScore_idx" ON "WebApp"("riskScore");

-- CreateIndex
CREATE INDEX "WebApp_lastSeenAt_idx" ON "WebApp"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "DomainAlias_domain_key" ON "DomainAlias"("domain");

-- CreateIndex
CREATE INDEX "DomainAlias_domain_idx" ON "DomainAlias"("domain");

-- CreateIndex
CREATE INDEX "DomainAlias_webAppId_idx" ON "DomainAlias"("webAppId");

-- CreateIndex
CREATE INDEX "Observation_timestamp_idx" ON "Observation"("timestamp");

-- CreateIndex
CREATE INDEX "Observation_domain_idx" ON "Observation"("domain");

-- CreateIndex
CREATE INDEX "Observation_studentId_idx" ON "Observation"("studentId");

-- CreateIndex
CREATE INDEX "Observation_deviceId_idx" ON "Observation"("deviceId");

-- CreateIndex
CREATE INDEX "Observation_schoolId_idx" ON "Observation"("schoolId");

-- CreateIndex
CREATE INDEX "Observation_webAppId_idx" ON "Observation"("webAppId");

-- CreateIndex
CREATE INDEX "Observation_sourceType_idx" ON "Observation"("sourceType");

-- CreateIndex
CREATE INDEX "Observation_timestamp_schoolId_idx" ON "Observation"("timestamp", "schoolId");

-- CreateIndex
CREATE INDEX "DataCollectionSignal_webAppId_idx" ON "DataCollectionSignal"("webAppId");

-- CreateIndex
CREATE INDEX "DataCollectionSignal_signalType_idx" ON "DataCollectionSignal"("signalType");

-- CreateIndex
CREATE INDEX "WebAppDataCategory_dataCategory_idx" ON "WebAppDataCategory"("dataCategory");

-- CreateIndex
CREATE INDEX "PrivacyReview_webAppId_idx" ON "PrivacyReview"("webAppId");

-- CreateIndex
CREATE INDEX "PrivacyReview_status_idx" ON "PrivacyReview"("status");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_webAppId_idx" ON "EvidenceArtifact"("webAppId");

-- CreateIndex
CREATE INDEX "EvidenceArtifact_artifactType_idx" ON "EvidenceArtifact"("artifactType");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGradeLevel" ADD CONSTRAINT "StudentGradeLevel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGradeLevel" ADD CONSTRAINT "StudentGradeLevel_gradeLevelId_fkey" FOREIGN KEY ("gradeLevelId") REFERENCES "GradeLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebApp" ADD CONSTRAINT "WebApp_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainAlias" ADD CONSTRAINT "DomainAlias_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataCollectionSignal" ADD CONSTRAINT "DataCollectionSignal_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAppDataCategory" ADD CONSTRAINT "WebAppDataCategory_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyReview" ADD CONSTRAINT "PrivacyReview_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceArtifact" ADD CONSTRAINT "EvidenceArtifact_webAppId_fkey" FOREIGN KEY ("webAppId") REFERENCES "WebApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
