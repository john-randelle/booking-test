import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { organization } from "../schema/auth-schema.js";
import type {
  Organization, OrganizationReader, OrganizationWriter,
} from "../ports/organization-repo.js";

const columns = {
  id: organization.id,
  name: organization.name,
  slug: organization.slug,
  createdAt: organization.createdAt,
};

export class DrizzleOrganizationRepository
  implements OrganizationReader, OrganizationWriter
{
  async list(): Promise<Organization[]> {
    return db.select(columns).from(organization);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const [row] = await db.select(columns).from(organization)
      .where(eq(organization.slug, slug)).limit(1);
    return row ?? null;
  }

  async create(input: { name: string; slug: string }): Promise<Organization> {
    const [row] = await db.insert(organization)
      .values({ id: crypto.randomUUID(), name: input.name, slug: input.slug })
      .returning(columns);
    if (!row) throw new Error("Failed to create organization");
    return row;
  }
}