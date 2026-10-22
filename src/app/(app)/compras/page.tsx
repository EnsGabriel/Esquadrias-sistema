"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import { useMoeda } from "@/lib/moeda";
import { otimizarCorte1D, PecaCorte, ResultadoCorte1D } from "@/lib/calc/cutting1d";
import { otimizarCorte2D, PecaVidro, ResultadoCorte2D } from "@/lib/calc/cutting2d";

type Obra = { id: string; nome: string };
type LinhaCompra = { materialId: string; nome: string; tipo: string; unidade: string; quantidade: number; custoTotal: number; detalhe?: string };

export default function ComprasPage() {
  const supabase = createClient();
  const { fmt } = useMoeda();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [listaCompras, setListaCompras] = useState<LinhaCompra[]>([]);
  const [cortesPerfil, setCortesPerfil] = useState<Record<string, ResultadoCorte1D>>({});
  const [cortesVidro, setCortesVidro] = useState<Record<string, ResultadoCorte2D>>({});
  const [nomesMateriais, setNomesMateriais] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("works").select("id, nome").order("nome").then(({ data }) => setObras((data as Obra[]) ?? []));
  }, []);

  async function calcular() {
    if (!obraId) return;
    setCarregando(true);

    const { data: budget } = await supabase
      .from("budgets")
      .select("id")
      .eq("work_id", obraId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!budget) {
      setListaCompras([]);
      setCortesPerfil({});
      setCortesVidro({});
      setCarregando(false);
      return;
    }

    const { data: itens } = await supabase
      .from("budget_items")
      .select("*, esquadria_models(*, esquadria_model_components(*)), materials:vidro_material_id(*)")
      .eq("budget_id", budget.id);

    const { data: todosMateriais } = await supabase.from("materials").select("*");
    const materiaisById: Record<string, any> = {};
    for (const m of todosMateriais ?? []) materiaisById[m.id] = m;

    const nomes: Record<string, string> = {};
    for (const m of todosMateriais ?? []) nomes[m.id] = m.nome;
    setNomesMateriais(nomes);

    const compraPorMaterial: Record<string, LinhaCompra> = {};
    const pecasPerfilPorMaterial: Record<string, PecaCorte[]> = {};
    const pecasVidroPorMaterial: Record<string, PecaVidro[]> = {};

    for (const item of itens ?? []) {
      const larguraM = item.largura_mm / 1000;
      const alturaM = item.altura_mm / 1000;
      const componentes = item.esquadria_models?.esquadria_model_components ?? [];

      for (const comp of componentes) {
        const material = materiaisById[comp.material_id];
        if (!material) continue;

        if (material.tipo === "perfil") {
          const fator = comp.fator ?? 1;
          const pecasBase: number[] = [];
          if (comp.tipo_consumo === "perimetro") {
            for (let k = 0; k < Math.max(1, Math.round(fator)); k++) {
              pecasBase.push(larguraM, larguraM, alturaM, alturaM);
            }
          } else if (comp.tipo_consumo === "travessa_h") {
            for (let k = 0; k < Math.max(1, Math.round(fator)); k++) pecasBase.push(larguraM);
          } else if (comp.tipo_consumo === "travessa_v") {
            for (let k = 0; k < Math.max(1, Math.round(fator)); k++) pecasBase.push(alturaM);
          }

          if (!pecasPerfilPorMaterial[material.id]) pecasPerfilPorMaterial[material.id] = [];
          const metrosTotal = pecasBase.reduce((a, b) => a + b, 0) * item.quantidade;

          for (let q = 0; q < item.quantidade; q++) {
            pecasBase.forEach((comprimento, idx) => {
              pecasPerfilPorMaterial[material.id].push({
                id: `${item.id}-${q}-${idx}`,
                comprimentoM: comprimento,
                rotulo: `${item.esquadria_models?.nome} (${item.largura_mm}×${item.altura_mm})`,
              });
            });
          }

          if (!compraPorMaterial[material.id]) {
            compraPorMaterial[material.id] = { materialId: material.id, nome: material.nome, tipo: "perfil", unidade: "m", quantidade: 0, custoTotal: 0 };
          }
          // o custo do perfil é calculado depois do plano de corte (barras inteiras)
          compraPorMaterial[material.id].quantidade += metrosTotal;
        }

        if (material.tipo === "ferragem" && comp.tipo_consumo === "unidade") {
          const qty = (comp.quantidade_fixa ?? comp.fator ?? 1) * item.quantidade;
          if (!compraPorMaterial[material.id]) {
            compraPorMaterial[material.id] = { materialId: material.id, nome: material.nome, tipo: "ferragem", unidade: "un", quantidade: 0, custoTotal: 0 };
          }
          compraPorMaterial[material.id].quantidade += qty;
          compraPorMaterial[material.id].custoTotal += qty * material.custo_unitario;
        }
      }

      if (item.vidro_material_id && materiaisById[item.vidro_material_id]) {
        const vidro = materiaisById[item.vidro_material_id];
        const areaM2 = larguraM * alturaM * item.quantidade;

        if (!pecasVidroPorMaterial[vidro.id]) pecasVidroPorMaterial[vidro.id] = [];
        for (let q = 0; q < item.quantidade; q++) {
          pecasVidroPorMaterial[vidro.id].push({
            id: `${item.id}-${q}`,
            larguraM,
            alturaM,
            rotulo: `${item.esquadria_models?.nome} (${item.largura_mm}×${item.altura_mm})`,
          });
        }

        if (!compraPorMaterial[vidro.id]) {
          compraPorMaterial[vidro.id] = { materialId: vidro.id, nome: vidro.nome, tipo: "vidro", unidade: "m²", quantidade: 0, custoTotal: 0 };
        }
        compraPorMaterial[vidro.id].quantidade += areaM2;
        compraPorMaterial[vidro.id].custoTotal += areaM2 * vidro.custo_unitario;
      }
    }

    const resultadosPerfil: Record<string, ResultadoCorte1D> = {};
    for (const [materialId, pecas] of Object.entries(pecasPerfilPorMaterial)) {
      const material = materiaisById[materialId];
      const comprimentoBarra = material?.comprimento_barra_m ?? 6;
      resultadosPerfil[materialId] = otimizarCorte1D(pecas, comprimentoBarra);
    }
    setCortesPerfil(resultadosPerfil);

    // Perfis: metros, barras inteiras a comprar, peso e custo conforme a cobrança (kg ou barra)
    for (const [materialId, corte] of Object.entries(resultadosPerfil)) {
      const material = materiaisById[materialId];
      const linha = compraPorMaterial[materialId];
      if (!material || !linha) continue;
      const compBarra = material.comprimento_barra_m ?? 6;
      const barras = corte.totalBarrasUsadas;
      const kgPorM = material.kg_por_metro ?? 0;
      const pesoBarrasKg = barras * compBarra * kgPorM;
      linha.detalhe = `${barras} ${barras === 1 ? "barra" : "barras"} de ${compBarra} m · ${pesoBarrasKg.toFixed(1)} kg (barras inteiras)`;
      if (material.unidade === "kg") linha.custoTotal = pesoBarrasKg * material.custo_unitario;
      else if (material.unidade === "barra") linha.custoTotal = barras * material.custo_unitario;
      else linha.custoTotal = linha.quantidade * material.custo_unitario;
    }
    setListaCompras(Object.values(compraPorMaterial).sort((a, b) => a.tipo.localeCompare(b.tipo)));

    const resultadosVidro: Record<string, ResultadoCorte2D> = {};
    for (const [materialId, pecas] of Object.entries(pecasVidroPorMaterial)) {
      const material = materiaisById[materialId];
      const largura = material?.largura_chapa_m ?? 3.21;
      const altura = material?.altura_chapa_m ?? 2.25;
      resultadosVidro[materialId] = otimizarCorte2D(pecas, largura, altura);
    }
    setCortesVidro(resultadosVidro);

    setCarregando(false);
  }

  return (
    <div>
      <PageHeader title="Compras e corte" subtitle="Lista de compras e plano de corte otimizado, por obra" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="panel p-4 flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <label className="label-field">Obra</label>
            <select className="input-field" value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">Selecione uma obra...</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={calcular} disabled={!obraId || carregando}>
            {carregando ? "Calculando..." : "Calcular"}
          </button>
        </div>

        {listaCompras.length > 0 && (
          <div className="panel">
            <div className="px-5 py-3 border-b border-border"><h2 className="font-semibold text-sm">Lista de compras</h2></div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Material</th><th>Tipo</th><th>Quantidade</th><th>Custo estimado</th></tr></thead>
                <tbody>
                  {listaCompras.map((l) => (
                    <tr key={l.materialId}>
                      <td className="font-medium">{l.nome}</td>
                      <td className="capitalize">{l.tipo}</td>
                      <td className="num">
                        {l.quantidade.toFixed(2)} {l.unidade}
                        {l.detalhe && <span className="block text-xs text-text-muted">{l.detalhe}</span>}
                      </td>
                      <td className="num">{fmt(l.custoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {Object.entries(cortesPerfil).map(([materialId, resultado]) => (
          <div key={materialId} className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Plano de corte — {nomesMateriais[materialId]} (barras)</h2>
              <div className="text-sm num text-text-muted">
                {resultado.totalBarrasUsadas} barras · aproveitamento {resultado.aproveitamentoMedioPct}% · sobra {resultado.sobraTotalM.toFixed(2)}m
              </div>
            </div>
            <div className="space-y-2">
              {resultado.barras.map((b) => (
                <div key={b.barraIndex} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-16 shrink-0">Barra {b.barraIndex}</span>
                  <div className="flex-1 h-6 bg-surface-sunken border border-border flex overflow-hidden">
                    {b.pecas.map((p, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${(p.comprimentoM / b.comprimentoBarraM) * 100}%` }}
                        className="h-full border-r border-surface-panel bg-ink-light/80 flex items-center justify-center"
                        title={p.rotulo}
                      >
                        <span className="text-[10px] text-white font-mono truncate px-0.5">{p.comprimentoM.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs num text-text-muted w-20 text-right">sobra {b.sobraM.toFixed(2)}m</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.entries(cortesVidro).map(([materialId, resultado]) => (
          <div key={materialId} className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Plano de corte — {nomesMateriais[materialId]} (chapas)</h2>
              <div className="text-sm num text-text-muted">
                {resultado.totalChapasUsadas} chapas · aproveitamento {resultado.aproveitamentoMedioPct}% · sobra {resultado.areaSobraTotalM2.toFixed(2)}m²
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultado.chapas.map((chapa) => (
                <div key={chapa.chapaIndex}>
                  <p className="text-xs text-text-muted mb-1">Chapa {chapa.chapaIndex} · {chapa.aproveitamentoPct}%</p>
                  <svg
                    viewBox={`0 0 ${chapa.larguraChapaM * 100} ${chapa.alturaChapaM * 100}`}
                    className="w-full border border-border bg-surface-sunken"
                  >
                    {chapa.pecas.map((p, idx) => {
                      const larguraDesenhada = p.rotacionada ? p.alturaM : p.larguraM;
                      const alturaDesenhada = p.rotacionada ? p.larguraM : p.alturaM;
                      return (
                        <g key={idx}>
                          <rect
                            x={p.x * 100}
                            y={p.y * 100}
                            width={larguraDesenhada * 100}
                            height={alturaDesenhada * 100}
                            fill="#C9D6E4"
                            stroke="#16233F"
                            strokeWidth={0.5}
                          />
                          <text
                            x={p.x * 100 + (larguraDesenhada * 100) / 2}
                            y={p.y * 100 + (alturaDesenhada * 100) / 2}
                            textAnchor="middle"
                            fontSize="6"
                            fill="#16233F"
                          >
                            {p.larguraM.toFixed(2)}×{p.alturaM.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
