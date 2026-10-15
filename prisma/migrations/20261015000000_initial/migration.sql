CREATE TYPE "WorkflowStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workflow" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'QUEUED',
  "report" TEXT,
  "errorMessage" TEXT,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowTask" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "agentKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "input" TEXT NOT NULL,
  "output" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WorkflowTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowEvent" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "agentKey" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Workflow_userId_createdAt_idx" ON "Workflow"("userId", "createdAt");
CREATE INDEX "Workflow_status_createdAt_idx" ON "Workflow"("status", "createdAt");
CREATE UNIQUE INDEX "WorkflowTask_workflowId_agentKey_key" ON "WorkflowTask"("workflowId", "agentKey");
CREATE INDEX "WorkflowTask_workflowId_status_idx" ON "WorkflowTask"("workflowId", "status");
CREATE INDEX "WorkflowEvent_workflowId_createdAt_idx" ON "WorkflowEvent"("workflowId", "createdAt");

ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;