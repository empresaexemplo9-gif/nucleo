/**
 * Cria uma empresa de demonstração com dados de exemplo.
 * Uso: npm run db:seed   (login: demo@nucleo.app / demo1234)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setupOrganization } from "../src/lib/defaults";

const db = new PrismaClient();

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

async function main() {
  const email = "demo@nucleo.app";
  if (await db.user.findUnique({ where: { email } })) {
    console.log("Demo já existe. Login: demo@nucleo.app / demo1234");
    return;
  }
  const hash = await bcrypt.hash("demo1234", 10);
  const org = await db.organization.create({ data: { name: "Acme Soluções", slug: "acme", primaryColor: "#4f46e5", accentColor: "#0ea5e9" } });
  const owner = await db.user.create({ data: { name: "Ana Souza", email, passwordHash: hash, avatarColor: "#6366f1" } });
  const u2 = await db.user.create({ data: { name: "Bruno Lima", email: "bruno@nucleo.app", passwordHash: hash, avatarColor: "#10b981" } });
  const u3 = await db.user.create({ data: { name: "Carla Mendes", email: "carla@nucleo.app", passwordHash: hash, avatarColor: "#f59e0b" } });
  await db.membership.createMany({
    data: [
      { userId: owner.id, orgId: org.id, role: "OWNER" },
      { userId: u2.id, orgId: org.id, role: "SALES" },
      { userId: u3.id, orgId: org.id, role: "MANAGER" },
    ],
  });
  const pipeline = await db.$transaction((tx) => setupOrganization(tx, org.id));
  const stages = await db.stage.findMany({ where: { pipelineId: pipeline.id }, orderBy: { position: "asc" } });
  const open = stages.filter((s) => s.type === "OPEN");
  const won = stages.find((s) => s.type === "WON")!;
  const lost = stages.find((s) => s.type === "LOST")!;
  const users = [owner, u2, u3];

  await db.customField.createMany({
    data: [
      { orgId: org.id, entity: "DEAL", key: "plano", label: "Plano", type: "SELECT", options: ["Básico", "Profissional", "Enterprise"], position: 0 },
      { orgId: org.id, entity: "CONTACT", key: "cpf", label: "CPF", type: "TEXT", position: 0 },
    ],
  });
  const products = await Promise.all(
    [["Implantação", 4500, "un"], ["Licença mensal", 890, "mês"], ["Consultoria", 250, "h"], ["Treinamento", 1800, "un"]].map(([name, price, unit]) =>
      db.product.create({ data: { orgId: org.id, name: name as string, price: price as number, unit: unit as string } }),
    ),
  );
  void products;

  const companyNames = ["Grupo Horizonte", "TechNova", "Construtora Alicerce", "Clínica Vida", "Escola Saber", "Mercado Bom Preço", "Logística Rápida", "Agro Verde", "Imobiliária Lar", "Studio Criativo", "Farmácia Saúde", "Auto Center Prime"];
  const people = ["João Pereira", "Mariana Costa", "Rafael Alves", "Fernanda Rocha", "Lucas Martins", "Patrícia Gomes", "Gustavo Ribeiro", "Juliana Carvalho", "Pedro Henrique", "Camila Duarte", "Thiago Barbosa", "Beatriz Nunes", "André Teixeira", "Larissa Freitas"];
  const cities = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Recife", "Salvador", "Goiânia"];
  const sources = ["Indicação", "Site", "Google Ads", "Instagram", "LinkedIn", "Evento"];

  const companies = await Promise.all(
    companyNames.map((name) =>
      db.company.create({ data: { orgId: org.id, name, city: rand(cities), state: "BR", industry: rand(["Serviços", "Varejo", "Saúde", "Educação", "Indústria", "Tecnologia"]), ownerId: rand(users).id } }),
    ),
  );
  const contacts = await Promise.all(
    people.map((name, i) =>
      db.contact.create({
        data: {
          orgId: org.id,
          name,
          email: name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".") + "@exemplo.com",
          phone: `119${String(80000000 + i * 1234567).slice(0, 8)}`,
          position: rand(["Diretor(a)", "Gerente", "Sócio(a)", "Coordenador(a)", "Comprador(a)"]),
          companyId: companies[i % companies.length]!.id,
          ownerId: rand(users).id,
          source: rand(sources),
          lifecycle: rand(["lead", "mql", "sql", "customer"]),
        },
      }),
    ),
  );

  const titles = ["Implantação CRM", "Licenças anuais", "Projeto de consultoria", "Expansão de unidades", "Renovação contrato", "Treinamento equipe", "Pacote premium", "Integração ERP"];
  for (let i = 0; i < 40; i++) {
    const contact = rand(contacts);
    const r = Math.random();
    const status = r < 0.6 ? "OPEN" : r < 0.82 ? "WON" : "LOST";
    const stage = status === "OPEN" ? rand(open) : status === "WON" ? won : lost;
    const created = daysAgo(Math.floor(Math.random() * 170) + 5);
    const closed = status === "OPEN" ? null : new Date(created.getTime() + Math.random() * (Date.now() - created.getTime()));
    const deal = await db.deal.create({
      data: {
        orgId: org.id,
        title: `${rand(titles)} — ${companies.find((c) => c.id === contact.companyId)?.name}`,
        value: Math.round((Math.random() * 45000 + 2000) / 100) * 100,
        pipelineId: pipeline.id,
        stageId: stage.id,
        status: status as "OPEN" | "WON" | "LOST",
        contactId: contact.id,
        companyId: contact.companyId,
        ownerId: rand(users).id,
        source: rand(sources),
        position: i * 1000,
        createdAt: created,
        stageChangedAt: daysAgo(Math.floor(Math.random() * 20)),
        closedAt: closed,
        expectedClose: status === "OPEN" ? new Date(Date.now() + Math.random() * 90 * 86400000) : null,
        lostReason: status === "LOST" ? rand(["Preço alto", "Escolheu concorrente", "Sem orçamento", "Sem resposta / sumiu"]) : null,
        tags: Math.random() < 0.3 ? [rand(["Quente", "VIP", "Retorno"])] : [],
        customFields: { plano: rand(["Básico", "Profissional", "Enterprise"]) },
      },
    });
    await db.timelineEvent.create({ data: { orgId: org.id, type: "DEAL_CREATED", dealId: deal.id, userId: deal.ownerId, createdAt: created } });
    if (status === "OPEN" && Math.random() < 0.75) {
      await db.activity.create({
        data: {
          orgId: org.id,
          type: rand(["CALL", "MEETING", "EMAIL", "WHATSAPP", "TASK"]),
          title: rand(["Ligar para alinhar proposta", "Reunião de apresentação", "Enviar proposta revisada", "Follow-up", "Agendar demonstração"]),
          dueAt: new Date(Date.now() + (Math.random() * 10 - 3) * 86400000),
          dealId: deal.id,
          contactId: deal.contactId,
          companyId: deal.companyId,
          assigneeId: deal.ownerId,
        },
      });
    }
  }
  await db.note.create({ data: { orgId: org.id, content: "Cliente pediu desconto para fechamento anual. Avaliar com a diretoria.", authorId: owner.id, contactId: contacts[0]!.id } });
  const ym = new Date().toISOString().slice(0, 7);
  await db.goal.create({ data: { orgId: org.id, period: ym, metric: "REVENUE", target: 150000 } });
  await db.automation.create({
    data: { orgId: org.id, name: "Follow-up de proposta", trigger: "DEAL_STAGE_ENTERED", stageId: open[3]!.id, action: "CREATE_ACTIVITY", config: { activityType: "CALL", title: "Follow-up da proposta: {negocio}", daysOffset: 2 } },
  });
  console.log("✅ Demo criada. Login: demo@nucleo.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
