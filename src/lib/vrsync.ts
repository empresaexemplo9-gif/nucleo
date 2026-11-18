import "server-only";

/** Tipos de imóvel em português → PropertyType do padrão VRSync (Grupo OLX: ZAP Imóveis, VivaReal, OLX). */
export const PROPERTY_TYPES: Record<string, string> = {
  Apartamento: "Residential / Apartment",
  Casa: "Residential / Home",
  "Casa de condomínio": "Residential / Condo",
  Sobrado: "Residential / Sobrado",
  Cobertura: "Residential / Penthouse",
  "Kitnet / conjugado": "Residential / Kitnet",
  Studio: "Residential / Studio",
  Flat: "Residential / Flat",
  Loft: "Residential / Loft",
  "Casa de vila": "Residential / Village House",
  "Terreno / lote": "Residential / Land Lot",
  Chácara: "Residential / Farm Ranch",
  "Sítio / fazenda": "Residential / Agricultural",
  "Sala comercial": "Commercial / Office",
  "Loja / ponto comercial": "Commercial / Business",
  "Galpão / depósito": "Commercial / Industrial",
  "Prédio comercial": "Commercial / Edificio Comercial",
  "Andar corporativo": "Commercial / Corporate Floor",
  Consultório: "Commercial / Consultorio",
  "Terreno comercial": "Commercial / Land Lot",
  "Garagem / vaga": "Commercial / Garage",
  Hotel: "Commercial / Hotel",
};

const TRANSACTION: Record<string, string> = { Venda: "For Sale", Locação: "For Rent", "Venda e locação": "Sale/Rent" };
const PUBLICATION: Record<string, string> = { Padrão: "STANDARD", Destaque: "PREMIUM", "Super destaque": "SUPER_PREMIUM" };
const DISPLAY: Record<string, string> = { "Endereço completo": "All", "Somente rua": "Street", "Somente bairro": "Neighborhood" };
const UF = /^[A-Z]{2}$/;

const esc = (v: unknown) =>
  String(v ?? "")
    // caracteres de controle quebram o XML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const cdata = (v: unknown) => `<![CDATA[${String(v ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const int = (v: unknown) => {
  const n = num(v);
  return n == null ? null : Math.max(0, Math.round(n));
};

export type FeedListing = { id: string; code: string; title: string; data: Record<string, unknown>; images: string[]; detailUrl?: string };
export type FeedHeader = { provider: string; email: string; contactName: string; telephone?: string | null };

/** Monta o XML VRSync com os imóveis publicáveis. Campos ausentes são omitidos (não enviados vazios). */
export function buildVrsync(header: FeedHeader, listings: FeedListing[]) {
  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">');
  out.push("  <Header>");
  out.push(`    <Provider>${esc(header.provider)}</Provider>`);
  out.push(`    <Email>${esc(header.email)}</Email>`);
  out.push(`    <ContactName>${esc(header.contactName)}</ContactName>`);
  out.push(`    <PublishDate>${new Date().toISOString().slice(0, 19)}</PublishDate>`);
  if (header.telephone) out.push(`    <Telephone>${esc(header.telephone)}</Telephone>`);
  out.push("  </Header>");
  out.push("  <Listings>");
  for (const l of listings) {
    const d = l.data;
    const tx = TRANSACTION[String(d.finalidade ?? "")] ?? "For Sale";
    const ptype = PROPERTY_TYPES[String(d.tipo ?? "")] ?? "Residential / Apartment";
    const usage = ptype.startsWith("Commercial") ? "Commercial" : "Residential";
    const line = (tag: string, v: unknown, attrs = "") => (v == null || v === "" ? null : `        <${tag}${attrs}>${esc(v)}</${tag}>`);
    const sale = num(d.preco_venda);
    const rent = num(d.aluguel);
    const details = [
      `        <UsageType>${usage}</UsageType>`,
      `        <PropertyType>${ptype}</PropertyType>`,
      `        <Description>${cdata(d.descricao || l.title)}</Description>`,
      tx !== "For Rent" && sale != null ? line("ListPrice", Math.round(sale), ' currency="BRL"') : null,
      tx !== "For Sale" && rent != null ? line("RentalPrice", Math.round(rent), ' currency="BRL" period="Monthly"') : null,
      num(d.condominio) != null ? line("PropertyAdministrationFee", Math.round(num(d.condominio)!), ' currency="BRL"') : null,
      num(d.iptu) != null ? line("Iptu", Math.round(num(d.iptu)!), ' currency="BRL" period="Yearly"') : null,
      num(d.area_util) != null ? line("LivingArea", Math.round(num(d.area_util)!), ' unit="square metres"') : null,
      num(d.area_total) != null ? line("LotArea", Math.round(num(d.area_total)!), ' unit="square metres"') : null,
      line("Bedrooms", int(d.quartos)),
      line("Bathrooms", int(d.banheiros)),
      line("Suites", int(d.suites)),
      line("Garage", int(d.vagas), ' type="Parking Space"'),
      line("YearBuilt", int(d.ano_construcao)),
    ].filter(Boolean);
    const uf = String(d.uf ?? "").trim().toUpperCase();
    const location = [
      `        <Country abbreviation="BR">Brasil</Country>`,
      UF.test(uf) ? `        <State abbreviation="${uf}">${uf}</State>` : null,
      line("City", d.cidade),
      line("Neighborhood", d.bairro),
      line("Address", d.endereco),
      line("StreetNumber", d.numero),
      line("Complement", d.complemento),
      line("PostalCode", String(d.cep ?? "").replace(/\D/g, "") || null),
    ].filter(Boolean);
    out.push("    <Listing>");
    out.push(`      <ListingID>${esc(String(d.referencia || l.code))}</ListingID>`);
    out.push(`      <Title>${cdata(l.title)}</Title>`);
    out.push(`      <TransactionType>${tx}</TransactionType>`);
    out.push(`      <PublicationType>${PUBLICATION[String(d.destaque ?? "")] ?? "STANDARD"}</PublicationType>`);
    if (l.detailUrl) out.push(`      <DetailViewUrl>${esc(l.detailUrl)}</DetailViewUrl>`);
    if (typeof d.tour_virtual === "string" && /^https?:\/\//.test(d.tour_virtual)) out.push(`      <VirtualTourLink>${esc(d.tour_virtual)}</VirtualTourLink>`);
    if (l.images.length || (typeof d.video === "string" && /^https?:\/\//.test(d.video))) {
      out.push("      <Media>");
      l.images.forEach((src, i) => out.push(`        <Item medium="image"${i === 0 ? ' primary="true"' : ""}>${esc(src)}</Item>`));
      if (typeof d.video === "string" && /^https?:\/\//.test(d.video)) out.push(`        <Item medium="video">${esc(d.video)}</Item>`);
      out.push("      </Media>");
    }
    out.push("      <Details>", ...(details as string[]), "      </Details>");
    out.push(`      <Location displayAddress="${DISPLAY[String(d.exibir_endereco ?? "")] ?? "Neighborhood"}">`, ...(location as string[]), "      </Location>");
    out.push("      <ContactInfo>", `        <Name>${esc(header.contactName)}</Name>`, `        <Email>${esc(header.email)}</Email>`, "      </ContactInfo>");
    out.push("    </Listing>");
  }
  out.push("  </Listings>");
  out.push("</ListingDataFeed>");
  return out.join("\n");
}
