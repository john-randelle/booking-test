export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface OrganizationReader {
  list(): Promise<Organization[]>;
  findBySlug(slug: string): Promise<Organization | null>;
}

export interface OrganizationWriter {
  create(input: { name: string; slug: string }): Promise<Organization>;
}