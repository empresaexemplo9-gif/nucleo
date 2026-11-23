import { db } from "@/lib/db";
import { baseUrl } from "@/lib/automation";
import { recordCode } from "@/lib/modules";
import { buildVrsync } from "@/lib/vrsync";

/**
 * Feed XML (padrão VRSync) dos imóveis para ZAP Imóveis, VivaReal e OLX.
 * Entram os imóveis em status não final, marcados para publicar e com finalidade definida.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const mod = await db.customModule.findUnique({ where: { feedToken: token }, include: { org: true } });
  if (!mod) return new Response("Feed não encontrado", { status: 404 });
  const records = await db.moduleRecord.findMany({
    where: { moduleId: mod.id, OR: [{ statusId: null }, { status: { isFinal: false } }], data: { path: ["publicar"], equals: true } },
    include: { files: { where: { mime: { startsWith: "image/" } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } } },
    orderBy: { number: "asc" },
    take: 5000,
  });
  const origin = baseUrl(mod.org) || new URL(req.url).origin;
  const admin = await db.membership.findFirst({ where: { orgId: mod.orgId, active: true, role: { in: ["OWNER", "ADMIN"] } }, include: { user: true }, orderBy: { createdAt: "asc" } });
  const settings = (mod.settings ?? {}) as { feed?: { email?: string; phone?: string } };
  const xml = buildVrsync(
    { provider: mod.org.name, email: settings.feed?.email || admin?.user.email || "", contactName: mod.org.name, telephone: settings.feed?.phone || admin?.user.phone },
    records.map((r) => ({
      id: r.id,
      code: recordCode(mod.prefix, r.number),
      title: r.title,
      data: (r.data ?? {}) as Record<string, unknown>,
      images: r.files.slice(0, 50).map((f) => `${origin}/api/public/feed/${token}/media/${f.id}`),
    })),
  );
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
