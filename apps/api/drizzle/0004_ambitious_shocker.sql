CREATE TABLE "appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"acuity_id" integer NOT NULL,
	"acuity_calendar_id" integer NOT NULL,
	"referrer_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"timezone" text NOT NULL,
	"appointment_type_id" integer NOT NULL,
	"type" text NOT NULL,
	"canceled" boolean DEFAULT false NOT NULL,
	"examinee_first_name" text,
	"examinee_last_name" text,
	"booker_name" text,
	"booker_email" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_acuity_id_unique" UNIQUE("acuity_id")
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_calendar_starts_idx" ON "appointment" USING btree ("acuity_calendar_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointment_referrer_starts_idx" ON "appointment" USING btree ("referrer_id","starts_at");