import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "crm_session";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { uid: string; oid: string };

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.uid !== "string" || typeof payload.oid !== "string") return null;
    return { uid: payload.uid, oid: payload.oid };
  } catch {
    return null;
  }
}
