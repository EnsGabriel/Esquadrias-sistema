"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import DesenhoVao from "@/components/DesenhoVao";
import { calcularItem, ModelComponent, MaterialLite } from "@/lib/calc/esquadria";

type Modelo = { id: string; nome: string; tipo: string; aceita_vidro: boolean };
type Material = {
  id: string;
  tipo: "perfil" | "vidro" | "ferragem";
  nome: string;
  cor_acabamento: string | null;
  kg_por_metro: number | null;
  kg_por_m2: number | null;
  custo_unitario: number;
  comprimento_barra_m: number | null;
};
type ItemOrcamento = {
  id: string;
  model_id: string;
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  vidro_material_id: string | null;
  cor_acabamento: string | null;
  peso_calc_kg: number;
  custo_calc: number;
  preco_venda_calc: number;
  esquadria_models?: { nome: string };
};

export default function ObraDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [obra, setObra] = useState<any>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [margemPadrao, setMargemPadrao] = useState(30);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [carregando, setCarregando] = useState(true);

  // estado do configurador
  const [modelId, setModelId] = useState("");
  const [larguraMm, setLarguraMm] = useState(1200);
  const [alturaMm, setAlturaMm] = useState(1000);
  const [quantidade, setQuantidade] = useState(1);
  const [vidroId, setVidroId] = useState("");
  const [corAcabamento, setCorAcabamento] = useState("Branco");
  const [componentesModelo, setComponentesModelo] = useState<ModelComponent[]>([]);

  async function carregarTudo() {
    setCarregando(true);
    const { data: obraData } = await supabase.from("works").select("*, clients(nome)").eq("id", params.id).single();
    setObra(obraData);

    let { data: budget } = await supabase
      .from("budgets")
      .select("*")
      .eq("work_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!budget) {
      const { data: novo } = await supabase
        .from("budgets")
        .insert({ work_id: params.id, margem_padrao_pct: 30 })
        .select()
        .single();
      budget = novo;
    }

    if (budget) {
      setBudgetId(budget.id);
      setMargemPadrao(budget.margem_padrao_pct);

      const { data: itensData } = await supabase
        .from("budget_items")
        .select("*, esquadria_models(nome)")
        .eq("budget_id", budget.id)
        .order("created_at");
      setItens((itensData as ItemOrcamento[]) ?? []);
    }

    const [{ data: modelosData }, { data: materiaisData }] = await Promise.all([
      supabase.from("esquadria_models").select("id, nome, tipo, aceita_vidro").eq("ativo", true).order("nome"),
      supabase.from("materials").select("*").eq("ativo", true),
    ]);
    setModelos((modelosData as Modelo[]) ?? []);
    setMateriais((materiaisData as Material[]) ?? []);
    if (modelosData && modelosData.length > 0 && !modelId) setModelId(modelosData[0].id);

    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    async function carregarComponentes() {
      if (!modelId) return;
      const { data } = await supabase.from("esquadria_model_components").select("*").eq("model_id", modelId);
      setComponentesModelo((data as ModelComponent[]) ?? []);
    }
    carregarComponentes();
  }, [modelId]);

  const materiaisById = useMemo(() => {
    const map: Record<string, MaterialLite> = {};
    for (const m of materiais) map[m.id] = m;
    return map;
  }, [materiais]);

  const modeloAtual = modelos.find((m) => m.id === modelId);
  const vidrosDisponiveis = materiais.filter((m) => m.tipo === "vidro");
  const vidroSelecionado = vidrosDisponiveis.find((v) => v.id === vidroId) ?? null;

  const calculo = useMemo(() => {
    if (!modelId) return null;
    return calcularItem({
      largura_mm: larguraMm,
      altura_mm: alturaMm,
      quantidade,
      components: componentesModelo,
      materiaisById,
      vidroMaterial: modeloAtual?.aceita_vidro ? vidroSelecionado : null,
      margemPct: margemPadrao,
    });
  }, [modelId, larguraMm, alturaMm, quantidade, componentesModelo, materiaisById, vidroSelecionado, modeloAtual, margemPadrao]);

  async function adicionarItem() {
    if (!budgetId || !modelId || !calculo) return;
    await supabase.from("budget_items").insert({
      budget_id: budgetId,
      model_id: modelId,
      largura_mm: larguraMm,
      altura_mm: alturaMm,
      quantidade,
      vidro_material_id: modeloAtual?.aceita_vidro ? vidroId || null : null,
      cor_acabamento: corAcabamento,
      margem_pct: margemPadrao,
      peso_calc_kg: calculo.pesoTotalKg * quantidade,
      custo_calc: calculo.custoTotalComQuantidade,
      preco_venda_calc: calculo.precoVendaTotalComQuantidade,
    });
    carregarTudo();
  }

  async function removerItem(id: string) {
    await supabase.from("budget_items").delete().eq("id", id);
    carregarTudo();
  }

  const totalCusto = itens.reduce((a, i) => a + i.custo_calc, 0);
  const totalVenda = itens.reduce((a, i) => a + i.preco_venda_calc, 0);
  const totalPeso = itens.reduce((a, i) => a + i.peso_calc_kg, 0);

  if (carregando) return <div className="p-4 sm:p-6 lg:p-8 text-text-faint text-sm">Carregando...</div>;
  if (!obra) return <div className="p-4 sm:p-6 lg:p-8 text-status-danger text-sm">Obra não encontrada.</div>;

  return (
    <div>
      <PageHeader title={obra.nome} subtitle={`${obra.clients?.nome ?? ""} — ${obra.endereco ?? "sem endereço"}`} />

      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* CONFIGURADOR */}
        <div className="xl:col-span-3 panel p-6">
          <h2 className="font-semibold mb-4">Configurar item</h2>

          {modelos.length === 0 ? (
            <p className="text-sm text-text-muted">Cadastre ao menos um modelo de esquadria antes de orçar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="label-field">Modelo</label>
                  <select className="input-field" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Largura (mm)</label>
                    <input type="number" className="input-field num" value={larguraMm} onChange={(e) => setLarguraMm(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label-field">Altura (mm)</label>
                    <input type="number" className="input-field num" value={alturaMm} onChange={(e) => setAlturaMm(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <label className="label-field">Quantidade</label>
                  <input type="number" min={1} className="input-field num" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
                </div>
                {modeloAtual?.aceita_vidro && (
                  <div>
                    <label className="label-field">Vidro</label>
                    <select className="input-field" value={vidroId} onChange={(e) => setVidroId(e.target.value)}>
                      <option value="">Sem vidro</option>
                      {vidrosDisponiveis.map((v) => (
                        <option key={v.id} value={v.id}>{v.nome} {v.cor_acabamento ? `— ${v.cor_acabamento}` : ""}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label-field">Cor / acabamento do perfil</label>
                  <input className="input-field" value={corAcabamento} onChange={(e) => setCorAcabamento(e.target.value)} />
                </div>
                <div>
                  <label className="label-field">Margem de venda (%)</label>
                  <input type="number" className="input-field num" value={margemPadrao} onChange={(e) => setMargemPadrao(Number(e.target.value))} />
                </div>
              </div>

              <div className="bg-surface-sunken border border-border flex items-center justify-center p-2">
                <DesenhoVao larguraMm={larguraMm} alturaMm={alturaMm} temVidro={Boolean(modeloAtual?.aceita_vidro && vidroId)} />
              </div>
            </div>
          )}

          {calculo && (
            <div className="mt-6 border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Metrica label="Perfil" valor={`${calculo.perfilMetrosLineares.toFixed(2)} m`} />
              <Metrica label="Vidro" valor={`${calculo.vidroAreaM2.toFixed(2)} m²`} />
              <Metrica label="Peso (un.)" valor={`${calculo.pesoTotalKg.toFixed(2)} kg`} />
              <Metrica label="Custo (un.)" valor={fmtMoeda(calculo.custoTotal)} />
              <Metrica label="Preço venda (un.)" valor={fmtMoeda(calculo.precoVendaUnitario)} destaque />
              <Metrica label={`Total (${quantidade}x) custo`} valor={fmtMoeda(calculo.custoTotalComQuantidade)} />
              <Metrica label={`Total (${quantidade}x) venda`} valor={fmtMoeda(calculo.precoVendaTotalComQuantidade)} destaque />
            </div>
          )}

          <button className="btn-accent mt-5 w-full" onClick={adicionarItem} disabled={!calculo || modelos.length === 0}>
            Adicionar item à obra
          </button>
        </div>

        {/* LISTA DE ITENS */}
        <div className="xl:col-span-2 panel p-6 flex flex-col">
          <h2 className="font-semibold mb-4">Itens do orçamento</h2>
          <div className="flex-1 overflow-y-auto -mx-2">
            {itens.length === 0 && <p className="text-sm text-text-faint px-2">Nenhum item adicionado ainda.</p>}
            {itens.map((item) => (
              <div key={item.id} className="px-2 py-3 border-b border-border flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.esquadria_models?.nome}</p>
                  <p className="text-xs text-text-muted num">
                    {item.largura_mm}×{item.altura_mm}mm · {item.quantidade}un
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm num font-medium">{fmtMoeda(item.preco_venda_calc)}</p>
                  <button onClick={() => removerItem(item.id)} className="text-xs text-status-danger hover:underline">remover</button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 mt-2 space-y-1">
            <div className="flex justify-between text-sm text-text-muted"><span>Peso total</span><span className="num">{totalPeso.toFixed(1)} kg</span></div>
            <div className="flex justify-between text-sm text-text-muted"><span>Custo total</span><span className="num">{fmtMoeda(totalCusto)}</span></div>
            <div className="flex justify-between text-base font-semibold text-ink"><span>Total do orçamento</span><span className="num">{fmtMoeda(totalVenda)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metrica({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`num font-medium ${destaque ? "text-accent-dark" : "text-text"}`}>{valor}</p>
    </div>
  );
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
