import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { hasRole, requireContext } from "@/lib/auth";

export async function guard(min: Role) {
  const ctx = await requireContext();
  if (!hasRole(ctx, min)) redirect("/settings/profile");
  return ctx;
}
