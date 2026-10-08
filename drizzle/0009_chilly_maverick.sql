CREATE INDEX "users_name_id_idx" ON "users" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "users_role_active_name_idx" ON "users" USING btree ("role","is_active","name","id");