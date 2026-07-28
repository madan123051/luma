import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  photographerName: text("photographer_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  reviewedBy: text("reviewed_by"),
});
