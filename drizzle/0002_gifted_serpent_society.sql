ALTER TABLE "company_reviews" ADD COLUMN "is_approved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_cr_approved" ON "company_reviews" USING btree ("is_approved");