import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  calendar: ["read", "sync", "assign"],
  appointment: ["read", "sync", "refresh"],
} as const;
export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
  calendar: ["read", "sync", "assign"],
  appointment: ["read", "sync"],
  ...adminAc.statements,
});
// Referrers and specialists can read appointments; AppointmentService limits
// which ones (their referrals / their calendar). Specialists may also refresh
// their own calendar; admins use the full sync instead.
export const referrerRole = ac.newRole({ calendar: ["read"], appointment: ["read"] });
export const specialistRole = ac.newRole({
  calendar: ["read"],
  appointment: ["read", "refresh"],
});
