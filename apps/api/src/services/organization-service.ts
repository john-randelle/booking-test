import type { Organization, OrganizationReader, OrganizationWriter } from "../ports/organization-repo.js";

export class ConflictError extends Error {}
export class ValidationError extends Error {}

export class OrganizationService {
  constructor(private readonly orgs: OrganizationReader & OrganizationWriter) {}

  list(): Promise<Organization[]> {
    return this.orgs.list();
  }

  async create(input: { name: string; slug: string }): Promise<Organization> {
    const slug = input.slug.trim().toLowerCase();
    if (!slug) throw new ValidationError("Slug is required");

    const existing = await this.orgs.findBySlug(slug);
    if (existing) throw new ConflictError("An organization with this slug already exists");

    return this.orgs.create({ name: input.name.trim(), slug });
  }
}