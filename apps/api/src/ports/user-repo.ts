export type UserRole = "admin" | "referrer" | "specialist";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string | null;
  banned: boolean | null;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  organizationId?: string; // required when role is "referrer"
}

export interface UserReader {
  findById(id: string): Promise<AppUser | null>;
  findByEmail(email: string): Promise<AppUser | null>;
  list(filter?: { organizationId?: string }): Promise<UserListItem[]>;
}

export interface UserWriter {
  create(input: CreateUserInput): Promise<AppUser>;
  setRole(id: string, role: UserRole): Promise<void>;
  setBanned(id: string, banned: boolean): Promise<void>;
}

export interface UserListItem extends AppUser {
  organizationId: string | null;
  organizationName: string | null;
  invited: boolean;
}

