ALTER TABLE "calendar" ADD COLUMN "specialist_id" text;--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_specialist_id_user_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_specialist_id_unique" UNIQUE("specialist_id");