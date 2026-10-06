CREATE TABLE "booking_detail" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"organization_id" text,
	"referrer_first_name" text NOT NULL,
	"referrer_last_name" text NOT NULL,
	"referrer_email" text NOT NULL,
	"referrer_phone" text,
	"examinee_email" text,
	"examinee_phone" text,
	"location_type" text NOT NULL,
	"intake_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_detail_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "booking_detail" ADD CONSTRAINT "booking_detail_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_detail" ADD CONSTRAINT "booking_detail_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_detail" ADD CONSTRAINT "booking_detail_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;