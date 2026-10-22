import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { Dinheiro } from "@/lib/moeda";

const SITUACAO: Record<string, string> = {
  orcamento: "Em orçamento",
  aprovada: "Aprovada",
  producao: "Em produção",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

const ROTA_MATERIAIS = "/materiais";

export default async function DashboardPage() {
  const supabase = createClient();

  const [obrasRes, clientesRes, modelosRes, materiaisRes, orcRes, recentesRes] = await Promise.all([
    supabase.from("works").select("id, status"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("esquadria_models").select("*", { count: "exact", head: true }),
    supabase.from("materials").select("tipo, custo_unitario"),
    supabase.from("budgets").select("id, status, budget_items(preco_venda_calc)").in("status", ["rascunho", "enviado"]),
    supabase
      .from("works")
      .select("id, nome, status, clients(nome)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const obras = obrasRes.data ?? [];
  const totalClientes = clientesRes.count ?? 0;
  const totalModelos = modelosRes.count ?? 0;
  const materiais = materiaisRes.data ?? [];
  const recentes = recentesRes.data ?? [];

  // obras por situação
  const porSituacao = Object.keys(SITUACAO).map((s) => ({
    chave: s,
    rotulo: SITUACAO[s],
    qtd: obras.filter((o: any) => o.status === s).length,
  }));
  const emAndamento = obras.filter((o: any) => ["orcamento", "aprovada", "producao"].includes(o.status)).length;

  // valor em orçamento aberto
  const valorEmAberto = (orcRes.data ?? []).reduce((acc: number, orc: any) => {
    const soma = (orc.budget_items ?? []).reduce((a: number, it: any) => a + (it.preco_venda_calc ?? 0), 0);
    return acc + soma;
  }, 0);

  // materiais
  const perfis = materiais.filter((m: any) => m.tipo === "perfil");
  const vidros = materiais.filter((m: any) => m.tipo === "vidro");
  const perfisSemPreco = perfis.filter((m: any) => !(m.custo_unitario > 0)).length;
  const vidrosSemPreco = vidros.filter((m: any) => !(m.custo_unitario > 0)).length;

  // primeiros passos (calculados a partir dos dados reais)
  const passos = [
    { titulo: "Cadastrar clientes", feito: totalClientes > 0, href: "/clientes", ajuda: "Nome, telefone e endereço de quem vai comprar." },
    { titulo: "Cadastrar perfis de alumínio", feito: perfis.length > 0, href: ROTA_MATERIAIS, ajuda: "Use “Carregar perfis do catálogo Línea Nova”." },
    { titulo: "Definir o preço dos perfis", feito: perfis.length > 0 && perfisSemPreco === 0, href: ROTA_MATERIAIS, ajuda: "Escolha por kg ou por barra e aplique a todos." },
    { titulo: "Cadastrar vidros com preço", feito: vidros.length > 0 && vidrosSemPreco === 0, href: ROTA_MATERIAIS, ajuda: "Preço por m² de cada espessura e cor." },
    { titulo: "Criar modelos de esquadria", feito: totalModelos > 0, href: "/modelos", ajuda: "A “receita” de cada tipo de janela ou porta." },
    { titulo: "Criar a primeira obra", feito: obras.length > 0, href: "/obras", ajuda: "Uma obra por cliente e projeto." },
  ];
  const passosFeitos = passos.filter((p) => p.feito).length;
  const tudoPronto = passosFeitos === passos.length;

  const alertas: { texto: string; href: string }[] = [];
  if (perfisSemPreco > 0) alertas.push({ texto: `${perfisSemPreco} perfil(is) sem preço. Sem preço, o orçamento sai com custo zero.`, href: ROTA_MATERIAIS });
  if (vidrosSemPreco > 0) alertas.push({ texto: `${vidrosSemPreco} vidro(s) sem preço por m².`, href: ROTA_MATERIAIS });

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="Resumo do que está acontecendo e o que falta configurar"
        actions={
          <>
            <Link href="/tutorial" className="btn-ghost">Tutorial</Link>
            <Link href="/obras" className="btn-primary">Nova obra</Link>
          </>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Indicador label="Obras em andamento" valor={String(emAndamento)} sub={`${obras.length} no total`} />
          <Indicador label="Em orçamento (aberto)" valor={<Dinheiro valor={valorEmAberto} />} sub="soma das propostas não fechadas" />
          <Indicador label="Clientes" valor={String(totalClientes)} />
          <Indicador label="Modelos de esquadria" valor={String(totalModelos)} />
        </div>

        {/* alertas */}
        {alertas.length > 0 && (
          <div className="panel p-4 border-status-warn">
            <p className="text-sm font-medium text-status-warn mb-2">Atenção</p>
            <ul className="space-y-1">
              {alertas.map((a, i) => (
                <li key={i} className="text-sm flex items-center justify-between gap-3">
                  <span className="text-text-muted">{a.texto}</span>
                  <Link href={a.href} className="text-xs text-ink hover:underline shrink-0">Resolver →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* primeiros passos */}
          <div className="panel lg:col-span-2">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Primeiros passos</h2>
              <span className="text-xs text-text-muted num">{passosFeitos} de {passos.length}</span>
            </div>
            {tudoPronto ? (
              <div className="px-5 py-6">
                <p className="text-sm font-medium">Tudo configurado.</p>
                <p className="text-sm text-text-muted mt-1">Agora é só criar obras, montar orçamentos e gerar pedidos à fábrica.</p>
              </div>
            ) : (
              <ul>
                {passos.map((p, i) => (
                  <li key={i} className="px-5 py-3 border-b border-border last:border-b-0 flex items-center gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                        p.feito ? "bg-status-ok border-status-ok text-white" : "border-border-strong text-text-muted"
                      }`}
                    >
                      {p.feito ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${p.feito ? "text-text-muted line-through" : "font-medium"}`}>{p.titulo}</p>
                      {!p.feito && <p className="text-xs text-text-muted">{p.ajuda}</p>}
                    </div>
                    {!p.feito && (
                      <Link href={p.href} className="text-xs text-ink hover:underline shrink-0">Abrir →</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* situação das obras */}
          <div className="panel">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Obras por situação</h2>
            </div>
            <ul className="px-5 py-3 space-y-3">
              {porSituacao.map((s) => (
                <li key={s.chave} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{s.rotulo}</span>
                  <span className="num font-medium">{s.qtd}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* últimas obras */}
        <div className="panel">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Últimas obras</h2>
            <Link href="/obras" className="text-xs text-ink hover:underline">Ver todas →</Link>
          </div>
          {recentes.length === 0 ? (
            <p className="px-5 py-6 text-sm text-text-faint">Nenhuma obra ainda. Crie a primeira em Obras.</p>
          ) : (
            <ul>
              {recentes.map((o: any) => (
                <li key={o.id} className="border-b border-border last:border-b-0">
                  <Link href={`/obras/${o.id}`} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-sunken">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.nome}</p>
                      <p className="text-xs text-text-muted truncate">{o.clients?.nome}</p>
                    </div>
                    <span className="text-xs text-text-muted shrink-0">{SITUACAO[o.status] ?? o.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* atalhos */}
        <div className="panel p-5">
          <h2 className="font-semibold text-sm mb-3">Atalhos</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/obras" className="btn-primary">Nova obra</Link>
            <Link href="/clientes" className="btn-ghost">Novo cliente</Link>
            <Link href="/pedido-fabrica" className="btn-ghost">Pedido à fábrica</Link>
            <Link href="/compras" className="btn-ghost">Compras e corte</Link>
            <Link href="/tutorial" className="btn-ghost">Ver tutorial</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Indicador({ label, valor, sub }: { label: string; valor: React.ReactNode; sub?: string }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-semibold text-ink num">{valor}</p>
      {sub && <p className="text-xs text-text-faint mt-1">{sub}</p>}
    </div>
  );
}
