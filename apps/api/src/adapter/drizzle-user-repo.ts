import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { user, account, member, organization } from "../schema/auth-schema.js";
import type {
  AppUser, CreateUserInput, UserReader, UserWriter, UserRole, UserListItem,
  SpecialistLookup, ReferrerLookup,
} from "../ports/user-repo.js";

const columns = {
  id: user.id,
  name: user.name,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  banned: user.banned,
};

export class DrizzleUserRepository
  implements UserReader, UserWriter, SpecialistLookup, ReferrerLookup
{
  async findById(id: string): Promise<AppUser | null> {
    const [row] = await db.select(columns).from(user).where(eq(user.id, id)).limit(1);
    return row ?? null;
  }

  async findByEmail(email: string): Promise<AppUser | null> {
    const [row] = await db.select(columns).from(user).where(eq(user.email, email)).limit(1);
    return row ?? null;
  }

  findSpecialistByEmail(email: string): Promise<AppUser | null> {
    return this.findByRoleAndEmail("specialist", email);
  }

  findReferrerByEmail(email: string): Promise<AppUser | null> {
    return this.findByRoleAndEmail("referrer", email);
  }

  private async findByRoleAndEmail(role: UserRole, email: string): Promise<AppUser | null> {
    const [row] = await db.select(columns).from(user)
      .where(and(
        sql`lower(${user.email}) = ${email.trim().toLowerCase()}`,
        eq(user.role, role),
      ))
      .limit(1);
    return row ?? null;
  }

  async findSpecialistById(id: string): Promise<AppUser | null> {
    const [row] = await db.select(columns).from(user)
      .where(and(eq(user.id, id), eq(user.role, "specialist")))
      .limit(1);
    return row ?? null;
  }

  async list(filter?: { organizationId?: string }): Promise<UserListItem[]> {
  const rows = await db
    .select({
      ...columns,
      organizationId: member.organizationId,
      organizationName: organization.name,
      credentialId: account.id,
      credentialPassword: account.password,
    })
    .from(user)
    .leftJoin(member, eq(member.userId, user.id))
    .leftJoin(organization, eq(organization.id, member.organizationId))
    .leftJoin(
      account,
      and(eq(account.userId, user.id), eq(account.providerId, "credential")),
    )
    .where(
      filter?.organizationId
        ? eq(member.organizationId, filter.organizationId)
        : undefined,
    );


  return rows.map(({ credentialId, credentialPassword, ...rest }) => ({
    ...rest,
    invited: credentialId !== null && credentialPassword === null,
  }));
}

  async create(input: CreateUserInput): Promise<AppUser> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(user).values({
        id: crypto.randomUUID(),
        name: `${input.firstName} ${input.lastName}`.trim(),
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        role: input.role,
        emailVerified: false,
      }).returning(columns);

      if (!created) throw new Error("Failed to create user");

      // credential account with NO password = the invited state
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: created.id,
        providerId: "credential",
        userId: created.id,
        password: null,
        updatedAt: new Date(),
      });

      // referrers belong to an organization; specialists do not
      if (input.role === "referrer" && input.organizationId) {
        await tx.insert(member).values({
          id: crypto.randomUUID(),
          userId: created.id,
          organizationId: input.organizationId,
          role: "member",
        });
      }

      return created;
    });
  }

  async setRole(id: string, role: UserRole): Promise<void> {
    await db.update(user).set({ role }).where(eq(user.id, id));
  }

  async setBanned(id: string, banned: boolean): Promise<void> {
    await db.update(user).set({ banned }).where(eq(user.id, id));
  }
}