CREATE TABLE "projects" (
  "id" UUID NOT NULL, "name" TEXT NOT NULL, "owner_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "project_nodes" (
  "id" UUID NOT NULL, "project_id" UUID NOT NULL, "parent_id" UUID,
  "name" TEXT NOT NULL, "kind" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_nodes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX "project_nodes_project_id_parent_id_idx" ON "project_nodes"("project_id", "parent_id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_nodes" ADD CONSTRAINT "project_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_nodes" ADD CONSTRAINT "project_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
