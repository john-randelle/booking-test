import type { UserRole, AppUser, CreateUserInput, UserReader, UserWriter, UserListItem } from "../ports/user-repo.js";
import type { InvitationSender } from "../ports/mailer.js";

export class ConflictError extends Error {}
export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const ASSIGNABLE_ROLES: UserRole[] = ["referrer", "specialist"];

export class UserService {
  constructor(
    private readonly reader: UserReader,
    private readonly writer: UserWriter,
    private readonly invitations: InvitationSender,
  ) {}

  list(filter?: { organizationId?: string }): Promise<UserListItem[]> {
    return this.reader.list(filter);
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    if (!ASSIGNABLE_ROLES.includes(input.role)) {
      throw new ValidationError("Role must be referrer or specialist");
    }
    if (input.role === "referrer" && !input.organizationId) {
      throw new ValidationError("A referrer must belong to an organization");
    }
    if (input.role === "specialist" && input.organizationId) {
      throw new ValidationError("Specialists do not belong to an organization");
    }
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new ValidationError("First and last name are required");
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.reader.findByEmail(email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const created = await this.writer.create({ ...input, email });
    await this.invitations.sendInvitation(created);
    return created;
  }

  async setRole(id: string, role: UserRole): Promise<void> {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new ValidationError("Role must be referrer or specialist");
    }
    await this.mustExist(id);
    await this.writer.setRole(id, role);
  }

  async setBanned(id: string, banned: boolean): Promise<void> {
    await this.mustExist(id);
    await this.writer.setBanned(id, banned);
  }

  async resendInvitation(id: string): Promise<void> {
    const found = await this.mustExist(id);
    await this.invitations.sendInvitation(found);
  }

  private async mustExist(id: string): Promise<AppUser> {
    const found = await this.reader.findById(id);
    if (!found) throw new NotFoundError("User not found");
    return found;
  }
}