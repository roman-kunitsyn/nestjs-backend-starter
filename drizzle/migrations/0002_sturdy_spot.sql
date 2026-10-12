ALTER TABLE "organizations" DROP CONSTRAINT "organizations_reserved_slug_ck";--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "ip_address" SET DATA TYPE inet USING "ip_address"::inet;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_session_id_auth_sessions_id_fk" FOREIGN KEY ("actor_session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_pending_email_uq" ON "organization_invitations" USING btree ("organization_id","normalized_email") WHERE status = 'pending';--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_reserved_slug_ck" CHECK (normalized_slug = slug AND normalized_slug NOT IN ('admin', 'system', 'api'));
