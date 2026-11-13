import { db } from "./db";
import type { Prisma } from "@prisma/client";

export async function logEvent(input: {
  orgId: string;
  type: string;
  userId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  recordId?: string | null;
  data?: Prisma.InputJsonValue;
}) {
  await db.timelineEvent.create({ data: { ...input, data: input.data ?? {} } });
}

export { EVENT_LABELS } from "./event-labels";
