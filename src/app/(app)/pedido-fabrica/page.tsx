"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import VidroSelect, { type VidroOpcao } from "@/components/VidroSelect";
import { createClient } from "@/lib/supabase/client";
import { useMoeda } from "@/lib/moeda";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { LINHAS, TIPOLOGIAS_NOVA, DESCRICAO_CORTE } from "@/lib/tipologiasNova";
import {
  achaTipologia,
  calcularPedido,
  lerMedida,
  ROTULO_TRATAMENTO,
  type ItemPedido,
  type MaterialPedido,
  type Tratamento,
} from "@/lib/calc/pedidoFabrica";

const CHAVE_RASCUNHO = "esquadrias:pedido-fabrica";

const sufixoNota = (nota?: string) => (nota ? ` (${nota})` : "");
const sufixoRotulo = (rotulo?: string) => (rotulo ? ` ${rotulo}` : "");

const fmtMm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtNum = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const CSS_IMPRESSAO = `
@media print {
  aside, header, .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: #fff !important; }
}
`;

export default function PedidoFabricaPage() {
  const supabase = createClient();
  const { fmt } = useMoeda();

  const [materiais, setMateriais] = useState<MaterialPedido[]>([]);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [referencia, setReferencia] = useState("");
  const [copiado, setCopiado] = useState(false);

  // formulário
  const [linha, setLinha] = useState<string>(LINHAS[0].id);
  const [tipologiaId, setTipologiaId] = useState(TIPOLOGIAS_NOVA[0].id);
  const [medida, setMedida] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [eixo, setEixo] = useState("");
  const [vidroId, setVidroId] = useState("");
  const [tratamento, setTratamento] = useState<Tratamento>("temperado");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("materials")
      .select("id, nome, tipo, cor_acabamento, espessura_mm, custo_unitario, kg_por_metro, comprimento_barra_m, unidade")
      .in("tipo", ["perfil", "vidro"])
      .then(({ data }) => setMateriais((data as MaterialPedido[]) ?? []));
    const salvo = lerJSON<{ itens?: ItemPedido[]; referencia?: string } | null>(CHAVE_RASCUNHO, null);
    if (salvo?.itens) setItens(salvo.itens);
    if (typeof salvo?.referencia === "string") setReferencia(salvo.referencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gravarJSON(CHAVE_RASCUNHO, { itens, referencia });
  }, [itens, referencia]);

  const tip = achaTipologia(tipologiaId)!;
  const tratamentoFixo: Tratamento | null = tip.vidro === "dvh" ? "dvh" : tip.vidro === "templado" ? "temperado" : null;
  const tratamentoEfetivo = tratamentoFixo ?? tratamento;
  const medidaLida = lerMedida(medida);
  const vidros: VidroOpcao[] = useMemo(
    () => materiais.filter((m) => m.tipo === "vidro"),
    [materiais]
  );

  function adicionar() {
    setErro(null);
    const m = lerMedida(medida);
    if (!m) return setErro("Digite a medida como 1200x1000 (largura x altura, em mm).");
    const q = Math.floor(Number(quantidade));
    if (!(q >= 1)) return setErro("A quantidade precisa ser 1 ou mais.");
    let e = 0;
    if (tip.usaEixo) {
      e = eixo.trim() ? Number(eixo.replace(",", ".")) : Math.round(m.alturaMm / 2);
      if (!(e > 120 && e < m.alturaMm - 91)) return setErro("O eixo (altura do travessão) precisa ficar dentro da altura da porta.");
    }
    setItens((atual) => [
      ...atual,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tipologiaId,
        larguraMm: m.larguraMm,
        alturaMm: m.alturaMm,
        eixoMm: e,
        quantidade: q,
        vidroId,
        tratamento: tratamentoEfetivo,
      },
    ]);
    setMedida("");
    setQuantidade("1");
  }

  const resultado = useMemo(() => calcularPedido(itens, materiais), [itens, materiais]);

  const avisosTipologia = useMemo(() => {
    const ids = Array.from(new Set(itens.map((i) => i.tipologiaId)));
    return ids.flatMap((id) => (achaTipologia(id)?.avisos ?? []).map((a) => `${achaTipologia(id)!.nome}: ${a}`));
  }, [itens]);

  const perfisSemPreco = resultado.resumoPerfis.filter((r) => r.custo === null).length;
  const vidrosSemPreco = resultado.vidros.filter((v) => v.custo === null).length;

  function textoPedido() {
    const linhas: string[] = [];
    linhas.push(`PEDIDO À FÁBRICA — ${LINHAS.find((l) => l.id === linha)?.nome ?? ""}`);
    if (referencia.trim()) linhas.push(`Referência: ${referencia.trim()}`);
    linhas.push("");
    linhas.push("ITENS");
    itens.forEach((it, i) => {
      const t = achaTipologia(it.tipologiaId)!;
      linhas.push(`${i + 1}) ${t.nome} — ${fmtMm(it.larguraMm)} x ${fmtMm(it.alturaMm)} mm — ${it.quantidade} un`);
    });
    linhas.push("");
    linhas.push("PERFIS (código — medida mm — qtd — corte)");
    resultado.perfis.forEach((l) =>
      linhas.push(`${l.codigo} ${l.nome}${sufixoNota(l.nota)} — ${fmtMm(l.medidaMm)} — ${l.qtd} — ${DESCRICAO_CORTE[l.corte]}`)
    );
    linhas.push("");
    linhas.push("BARRAS A COMPRAR");
    resultado.resumoPerfis.forEach((r) =>
      linhas.push(`${r.codigo} ${r.nome} — ${r.barras} barra(s) de ${r.compBarraM} m — ${fmtNum(r.pesoBarrasKg, 1)} kg`)
    );
    linhas.push("");
    linhas.push("VIDROS (largura x altura mm — qtd)");
    resultado.vidros.forEach((v) =>
      linhas.push(`${v.descricao}${sufixoRotulo(v.rotulo)} — ${fmtMm(v.larguraMm)} x ${fmtMm(v.alturaMm)} — ${v.qtd} un`)
    );
    return linhas.join("\n");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoPedido());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert("Não foi possível copiar automaticamente. Use Imprimir / salvar PDF.");
    }
  }

  const tiposPorGrupo = ["Janelas", "Portas"] as const;

  return (
    <div>
      <style>{CSS_IMPRESSAO}</style>
      <PageHeader
        title="Pedido à fábrica"
        subtitle="Digite o modelo e a medida: o sistema gera os cortes dos perfis e o tamanho dos vidros"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* FORMULÁRIO */}
        <div className="panel p-5 no-print">
          <h2 className="font-semibold text-sm mb-4">Adicionar ao pedido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Linha do catálogo</label>
              <select className="input-field" value={linha} onChange={(e) => setLinha(e.target.value)}>
                {LINHAS.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <label className="label-field">Modelo</label>
              <select className="input-field" value={tipologiaId} onChange={(e) => setTipologiaId(e.target.value)}>
                {tiposPorGrupo.map((g) => (
                  <optgroup key={g} label={g}>
                    {TIPOLOGIAS_NOVA.filter((t) => t.grupo === g).map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-text-faint mt-1">Fórmulas do catálogo Línea Nova, página {tip.pagina}.</p>
            </div>

            <div>
              <label className="label-field">Medida (largura x altura, mm)</label>
              <input
                className="input-field num"
                placeholder="ex.: 1200x1000"
                value={medida}
                onChange={(e) => setMedida(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
              />
              <p className="text-xs text-text-muted mt-1 num">
                {medidaLida ? `Largura ${fmtMm(medidaLida.larguraMm)} mm × Altura ${fmtMm(medidaLida.alturaMm)} mm` : "\u00a0"}
              </p>
            </div>
            <div>
              <label className="label-field">Quantidade</label>
              <input className="input-field num" inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            {tip.usaEixo && (
              <div>
                <label className="label-field">Eixo — altura do travessão (mm)</label>
                <input
                  className="input-field num"
                  inputMode="numeric"
                  placeholder={medidaLida ? String(Math.round(medidaLida.alturaMm / 2)) : "metade da altura"}
                  value={eixo}
                  onChange={(e) => setEixo(e.target.value)}
                />
                <p className="text-xs text-text-faint mt-1">Se deixar vazio, usa a metade da altura.</p>
              </div>
            )}

            <div>
              <label className="label-field">Tipo de vidro</label>
              {tratamentoFixo ? (
                <input className="input-field bg-surface-sunken" disabled value={ROTULO_TRATAMENTO[tratamentoFixo]} />
              ) : (
                <select className="input-field" value={tratamento} onChange={(e) => setTratamento(e.target.value as Tratamento)}>
                  <option value="temperado">Temperado</option>
                  <option value="comum">Comum</option>
                  <option value="laminado">Laminado</option>
                </select>
              )}
              {tratamentoFixo && <p className="text-xs text-text-faint mt-1">Este modelo do catálogo usa vidro {tratamentoFixo === "dvh" ? "DVH (duplo)" : "temperado"}.</p>}
            </div>
            <div className="lg:col-span-2">
              <label className="label-field">Vidro (espessura e cor)</label>
              <VidroSelect vidros={vidros} value={vidroId} onChange={setVidroId} />
            </div>
          </div>

          {tip.avisos.length > 0 && (
            <ul className="mt-4 text-xs text-status-warn space-y-1 list-disc pl-5">
              {tip.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
          {erro && <p className="text-sm text-status-danger mt-3">{erro}</p>}

          <button className="btn-accent mt-5" onClick={adicionar}>
            Adicionar ao pedido
          </button>
        </div>

        {/* ITENS */}
        {itens.length > 0 && (
          <div className="panel">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
              <h2 className="font-semibold text-sm">Itens do pedido</h2>
              <div className="no-print">
                <input
                  className="input-field w-64"
                  placeholder="Referência (cliente / obra)"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            </div>
            <div className="print-only hidden px-5 pt-3 text-sm">
              {referencia && <p><strong>Referência:</strong> {referencia}</p>}
              <p><strong>Linha:</strong> {LINHAS.find((l) => l.id === linha)?.nome}</p>
            </div>
            <ul>
              {itens.map((it, i) => {
                const t = achaTipologia(it.tipologiaId)!;
                return (
                  <li key={it.id} className="px-5 py-3 border-b border-border last:border-b-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {i + 1}. {t.nome}
                      </p>
                      <p className="text-xs text-text-muted num">
                        {fmtMm(it.larguraMm)} × {fmtMm(it.alturaMm)} mm · {it.quantidade} un · vidro {ROTULO_TRATAMENTO[it.tratamento].toLowerCase()}
                        {t.usaEixo ? ` · eixo ${fmtMm(it.eixoMm)} mm` : ""}
                      </p>
                    </div>
                    <button
                      className="text-xs text-status-danger hover:underline shrink-0 no-print"
                      onClick={() => setItens((a) => a.filter((x) => x.id !== it.id))}
                    >
                      remover
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* RESULTADO */}
        {itens.length > 0 && (
          <>
            {(resultado.avisos.length > 0 || avisosTipologia.length > 0) && (
              <div className="panel p-4 border-status-warn">
                <p className="text-sm font-medium text-status-warn mb-2">Confira antes de enviar</p>
                <ul className="text-xs text-text-muted space-y-1 list-disc pl-5">
                  {[...resultado.avisos, ...avisosTipologia].map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panel">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm">Vidros — tamanhos para pedir à fábrica</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Vidro</th>
                      <th className="text-right">Largura × Altura (mm)</th>
                      <th className="text-right">Qtd.</th>
                      <th className="text-right">m²</th>
                      <th>Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.vidros.map((v, i) => (
                      <tr key={i}>
                        <td>
                          {v.descricao}
                          {v.rotulo && <span className="text-text-muted"> — {v.rotulo}</span>}
                        </td>
                        <td className="num text-right font-medium">{fmtMm(v.larguraMm)} × {fmtMm(v.alturaMm)}</td>
                        <td className="num text-right">{v.qtd}</td>
                        <td className="num text-right">{fmtNum(v.areaM2, 3)}</td>
                        <td className="num text-text-muted">{v.itens.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm">Perfis — lista de corte</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Perfil</th>
                      <th className="text-right">Medida (mm)</th>
                      <th className="text-right">Qtd.</th>
                      <th>Corte</th>
                      <th className="text-right">Peso (kg)</th>
                      <th>Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.perfis.map((l, i) => (
                      <tr key={i}>
                        <td className="font-medium">{l.codigo}</td>
                        <td>
                          {l.nome}
                          {l.nota && <span className="text-text-muted"> ({l.nota})</span>}
                        </td>
                        <td className="num text-right font-medium">{fmtMm(l.medidaMm)}</td>
                        <td className="num text-right">{l.qtd}</td>
                        <td className="text-text-muted">{DESCRICAO_CORTE[l.corte]}</td>
                        <td className="num text-right">{fmtNum(l.pesoKg)}</td>
                        <td className="num text-text-muted">{l.itens.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm">Perfis — o que comprar (barras inteiras)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Perfil</th>
                      <th className="text-right">Metros</th>
                      <th className="text-right">Barras</th>
                      <th className="text-right">Peso das barras (kg)</th>
                      <th className="text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resumoPerfis.map((r) => (
                      <tr key={r.codigo}>
                        <td className="font-medium">{r.codigo}</td>
                        <td>{r.nome}</td>
                        <td className="num text-right">{fmtNum(r.metros)}</td>
                        <td className="num text-right">{r.barras} × {fmtNum(r.compBarraM, 0)} m</td>
                        <td className="num text-right">{fmtNum(r.pesoBarrasKg, 1)}</td>
                        <td className="num text-right">{r.custo === null ? <span className="text-status-warn text-xs">sem preço</span> : fmt(r.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Total label="Peso dos perfis" valor={`${fmtNum(resultado.totais.pesoKg, 1)} kg`} />
                <Total label="Barras (inteiras)" valor={String(resultado.totais.barras)} />
                <Total label="Vidro" valor={`${fmtNum(resultado.totais.areaVidroM2, 2)} m²`} />
                <Total label="Custo estimado" valor={fmt(resultado.totais.custoPerfis + resultado.totais.custoVidros)} destaque />
              </div>
              {(perfisSemPreco > 0 || vidrosSemPreco > 0) && (
                <p className="text-xs text-status-warn mt-3">
                  O custo está incompleto: {perfisSemPreco > 0 && `${perfisSemPreco} perfil(is) sem preço`}
                  {perfisSemPreco > 0 && vidrosSemPreco > 0 && " e "}
                  {vidrosSemPreco > 0 && `${vidrosSemPreco} vidro(s) sem preço ou não escolhido(s)`}. Cadastre em Materiais.
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-5 no-print">
                <button className="btn-primary" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar pedido (texto)"}</button>
                <button className="btn-ghost" onClick={() => window.print()}>Imprimir / salvar PDF</button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    if (confirm("Limpar todos os itens do pedido?")) setItens([]);
                  }}
                >
                  Limpar pedido
                </button>
              </div>
            </div>
          </>
        )}

        {itens.length === 0 && (
          <p className="text-sm text-text-faint">
            Nenhum item ainda. Escolha o modelo, digite a medida (por exemplo 1200x1000) e clique em “Adicionar ao pedido”.
          </p>
        )}
      </div>
    </div>
  );
}

function Total({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`num mt-1 ${destaque ? "text-xl font-semibold text-ink" : "text-lg"}`}>{valor}</p>
    </div>
  );
}
