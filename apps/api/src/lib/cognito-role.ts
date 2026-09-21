const ADMIN_GROUPS = ["admin"] as const;

function decodePayload(idToken: string): Record<string, unknown> | null {
  try {
    const encoded = idToken.split(".")[1];
    if (!encoded) return null;
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getRoleFromCognitoToken(idToken: string): string {
  const payload = decodePayload(idToken);
  if (!payload) return "referrer";
  const groups = (payload["cognito:groups"] as string[] | undefined) ?? [];
  return groups.some((g) => (ADMIN_GROUPS as readonly string[]).includes(g))
    ? "admin"
    : "referrer";
}

export function getProfileFromCognitoToken(
  idToken: string,
): { firstName: string; lastName: string } | null {
  const payload = decodePayload(idToken);
  if (!payload) return null;
  const firstName = (payload["given_name"] as string) ?? "";
  const lastName = (payload["family_name"] as string) ?? "";
  if (!firstName && !lastName) return null;
  return { firstName, lastName };
}