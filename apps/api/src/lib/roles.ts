import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {...defaultStatements, calendar: ["read", "sync"]} as const;
export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({calendar: ["read", "sync"], ...adminAc.statements});
export const referrerRole = ac.newRole({ calendar: ["read"] });
export const specialistRole = ac.newRole({ calendar: ["read"] });