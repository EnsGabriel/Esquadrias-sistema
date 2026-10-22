import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { Dinheiro } from "@/lib/moeda";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: totalObras }, { count: totalClientes }, { data: orcamentosAbertos }] =
    await Promise.all([
      supabase.from("works").select("*", { count: "exact", head: true }),
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("budgets")
        .select("id, budget_items(preco_venda_calc)")
        .in("status", ["rascunho", "enviado"]),
    ]);

  const valorEmAberto = (orcamentosAbertos ?? []).reduce((acc, orc: any) => {
    const soma = (orc.budget_items ?? []).reduce(
      (a: number, item: any) => a + (item.preco_venda_calc ?? 0),
      0
    );
    return acc + soma;
  }, 0);

  return (
    <div>
      <PageHeader title="Painel" subtitle="Visão geral do sistema" />
      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Indicador label="Obras cadastradas" valor={String(totalObras ?? 0)} />
        <Indicador label="Clientes cadastrados" valor={String(totalClientes ?? 0)} />
        <Indicador
          label="Em orçamento (aberto)"
          valor={<Dinheiro valor={valorEmAberto} />}
        />
      </div>
    </div>
  );
}

function Indicador({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-semibold text-ink font-mono">{valor}</p>
    </div>
  );
}
