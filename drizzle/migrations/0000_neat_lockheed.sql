CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."session_revocation_reason" AS ENUM('logout', 'password_reset', 'password_change', 'account_disabled', 'refresh_reuse', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'disabled');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_digest" text NOT NULL,
	"family_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" "session_revocation_reason",
	"user_agent" text,
	"ip_address" "inet"
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_token_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"reuse_detected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"password_hash" text,
	"display_name" varchar(200),
	"email_verified_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_roles" (
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "membership_roles_pk" PRIMARY KEY("membership_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"role_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"invited_by_membership_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"normalized_slug" varchar(100) NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"actor_session_id" uuid,
	"action" varchar(120) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(200),
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" varchar(100) NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"locked_until" timestamp with time zone,
	CONSTRAINT "email_outbox_attempt_count_ck" CHECK (attempt_count >= 0),
	CONSTRAINT "email_outbox_status_ck" CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "example_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "resource_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_token_history" ADD CONSTRAINT "refresh_token_history_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_organization_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "example_resources" ADD CONSTRAINT "example_resources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_created_idx" ON "auth_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_digest_uq" ON "auth_sessions" USING btree ("refresh_token_digest");--> statement-breakpoint
CREATE INDEX "auth_sessions_family_idx" ON "auth_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_tokens_digest_uq" ON "email_verification_tokens" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_digest_uq" ON "password_reset_tokens" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_history_digest_uq" ON "refresh_token_history" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "refresh_token_history_session_rotated_idx" ON "refresh_token_history" USING btree ("session_id","rotated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_normalized_email_uq" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_roles_one_role_uq" ON "membership_roles" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_token_digest_uq" ON "organization_invitations" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "organization_invitations_org_status_idx" ON "organization_invitations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_invitations_email_status_idx" ON "organization_invitations" USING btree ("normalized_email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_org_user_uq" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_id_org_uq" ON "organization_memberships" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_user_status_idx" ON "organization_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "organization_memberships_org_status_idx" ON "organization_memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_normalized_slug_uq" ON "organizations" USING btree ("normalized_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_id_slug_uq" ON "organizations" USING btree ("id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_uq" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_uq" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE INDEX "audit_events_org_created_id_idx" ON "audit_events" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "email_outbox_dispatch_idx" ON "email_outbox" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "example_resources_id_org_uq" ON "example_resources" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "example_resources_org_created_id_idx" ON "example_resources" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "example_resources_org_status_idx" ON "example_resources" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "example_resources" ADD CONSTRAINT "example_resources_creator_org_fk" FOREIGN KEY ("created_by_membership_id","organization_id") REFERENCES "public"."organization_memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;
