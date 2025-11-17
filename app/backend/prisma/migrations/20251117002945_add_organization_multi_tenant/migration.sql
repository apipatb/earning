-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');

-- AlterTable: Add currentOrganizationId to users table
ALTER TABLE "users" ADD COLUMN "current_organization_id" TEXT;

-- AlterTable: Add organizationId to teams table
ALTER TABLE "teams" ADD COLUMN "organization_id" TEXT;

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo" VARCHAR(500),
    "website" VARCHAR(500),
    "stripe_customer_id" VARCHAR(255),
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: organization_members
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited_at" TIMESTAMP(3),
    "invited_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: organization_invitations
CREATE TABLE "organization_invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "token" VARCHAR(500) NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE UNIQUE INDEX "organization_invitations_token_key" ON "organization_invitations"("token");

-- CreateIndex: Performance indexes for organizations table
CREATE INDEX "organizations_owner_id_status_idx" ON "organizations"("owner_id", "status");
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");
CREATE INDEX "organizations_status_created_at_idx" ON "organizations"("status", "created_at" DESC);
CREATE INDEX "organizations_stripe_customer_id_idx" ON "organizations"("stripe_customer_id");

-- CreateIndex: Performance indexes for organization_members table
CREATE INDEX "organization_members_organization_id_role_idx" ON "organization_members"("organization_id", "role");
CREATE INDEX "organization_members_user_id_joined_at_idx" ON "organization_members"("user_id", "joined_at" DESC);
CREATE INDEX "organization_members_organization_id_user_id_role_idx" ON "organization_members"("organization_id", "user_id", "role");

-- CreateIndex: Performance indexes for organization_invitations table
CREATE INDEX "organization_invitations_organization_id_email_idx" ON "organization_invitations"("organization_id", "email");
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");
CREATE INDEX "organization_invitations_token_idx" ON "organization_invitations"("token");
CREATE INDEX "organization_invitations_expires_at_idx" ON "organization_invitations"("expires_at");
CREATE INDEX "organization_invitations_organization_id_created_at_idx" ON "organization_invitations"("organization_id", "created_at" DESC);

-- CreateIndex: Performance index for teams table organizationId
CREATE INDEX "teams_organization_id_is_active_idx" ON "teams"("organization_id", "is_active");

-- AddForeignKey: organizations -> users (owner)
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: organization_members -> organizations
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: organization_members -> users
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: organization_invitations -> organizations
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: teams -> organizations (optional)
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "organizations" IS 'Multi-tenant organizations for managing users and teams';
COMMENT ON TABLE "organization_members" IS 'Members of an organization with their roles';
COMMENT ON TABLE "organization_invitations" IS 'Pending invitations to join an organization';
COMMENT ON COLUMN "organizations"."settings" IS 'JSON field for organization-specific settings and configuration';
COMMENT ON COLUMN "organizations"."status" IS 'Organization status: ACTIVE, SUSPENDED, or ARCHIVED';
COMMENT ON COLUMN "organization_members"."role" IS 'Member role: OWNER, ADMIN, MEMBER, or GUEST';
COMMENT ON COLUMN "users"."current_organization_id" IS 'The currently active organization for the user (optional)';
COMMENT ON COLUMN "teams"."organization_id" IS 'The organization this team belongs to (optional for backward compatibility)';
