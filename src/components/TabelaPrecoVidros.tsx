"use client";

import { useMemo, useRef, useState } from "react";
import { useMoeda } from "@/lib/moeda";

export type VidroPreco = {
  id: string;
  nome: string;
  cor_acabamento: string | null;
  espessura_mm: number | null;
  largura_chapa_m: number | null;
  altura_chapa_m: number | null;
  custo_unitario: number; // por m², guardado em guaraníes
};

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-text-muted transition-transform ${aberto ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Tabela de preços dos vidros. Painel expansível; dentro dele, um grupo
 * expansível por espessura. O valor do m² é editável direto na linha.
 */
export default function TabelaPrecoVidros({
  vidros,
  onSalvarPreco,
  onEditar,
  onCarregarPadrao,
}: {
  vidros: VidroPreco[];
  onSalvarPreco: (id: string, valor: number) => Promise<boolean>;
  onEditar: (id: string) => void;
  onCarregarPadrao?: () => void;
}) {
  const { fmt: fmtMoeda, simbolo } = useMoeda();
  const [painelAberto, setPainelAberto] = useState(true);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  const grupos = useMemo(() => {
    const mapa = new Map<number, VidroPreco[]>();
    for (const v of vidros) {
      const k = v.espessura_mm ?? 0;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(v);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([esp, itens]) => {
        const precos = itens.map((i) => i.custo_unitario).filter((p) => p > 0);
        return {
          chave: String(esp),
          espessura: esp === 0 ? null : esp,
          itens: itens.sort((a, b) => a.nome.localeCompare(b.nome)),
          min: precos.length ? Math.min(...precos) : null,
          max: precos.length ? Math.max(...precos) : null,
          semPreco: itens.filter((i) => i.custo_unitario <= 0).length,
        };
      });
  }, [vidros]);

  const totalSemPreco = vidros.filter((v) => v.custo_unitario <= 0).length;

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setPainelAberto((a) => !a)}
        aria-expanded={painelAberto}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold text-sm">Preços dos vidros ({simbolo} por m²)</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {vidros.length} {vidros.length === 1 ? "vidro" : "vidros"} cadastrados
            {totalSemPreco > 0 && (
              <span className="text-status-warn"> · {totalSemPreco} sem preço</span>
            )}
          </p>
        </div>
        <Chevron aberto={painelAberto} />
      </button>

      {painelAberto && (
        <div className="border-t border-border">
          {vidros.length === 0 && (
            <p className="px-5 py-4 text-sm text-text-faint">
              Nenhum vidro cadastrado ainda. Use “+ Novo material” e escolha o tipo Vidro
              {onCarregarPadrao ? ", ou carregue a tabela padrão abaixo." : "."}
            </p>
          )}

          {grupos.map((g) => {
            const aberto = Boolean(gruposAbertos[g.chave]);
            return (
              <div key={g.chave} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => setGruposAbertos((s) => ({ ...s, [g.chave]: !aberto }))}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-sunken"
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="font-medium text-sm">
                      {g.espessura ? `${String(g.espessura).replace(".", ",")} mm` : "Sem espessura definida"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {g.itens.length} {g.itens.length === 1 ? "tipo" : "tipos"}
                      {g.semPreco > 0 && <span className="text-status-warn"> · {g.semPreco} sem preço</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-text-muted num hidden sm:inline">
                      {g.min === null
                        ? "—"
                        : g.min === g.max
                        ? `${fmtMoeda(g.min)}/m²`
                        : `${fmtMoeda(g.min)} a ${fmtMoeda(g.max!)}/m²`}
                    </span>
                    <Chevron aberto={aberto} />
                  </div>
                </button>

                {aberto && (
                  <div className="bg-surface-sunken/50 px-5 pb-3 overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="text-xs text-text-muted text-left">
                          <th className="py-2 font-medium">Vidro</th>
                          <th className="py-2 font-medium">Chapa</th>
                          <th className="py-2 font-medium text-right">Por chapa</th>
                          <th className="py-2 font-medium text-right w-40">{simbolo} / m²</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.itens.map((v) => (
                          <LinhaPreco key={v.id} vidro={v} onSalvarPreco={onSalvarPreco} onEditar={onEditar} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {onCarregarPadrao && (
            <div className="px-5 py-3 border-t border-border">
              <button type="button" onClick={onCarregarPadrao} className="text-xs text-ink hover:underline">
                Carregar tabela padrão de vidros (6, 8 e 10 mm — incolor e fumê)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaPreco({
  vidro,
  onSalvarPreco,
  onEditar,
}: {
  vidro: VidroPreco;
  onSalvarPreco: (id: string, valor: number) => Promise<boolean>;
  onEditar: (id: string) => void;
}) {
  const { lerNumero, paraBanco, textoEdicao, paraExibicao, moeda } = useMoeda();
  const [texto, setTexto] = useState<string | null>(null); // null = sem edição em curso
  const [estado, setEstado] = useState<"idle" | "salvando" | "salvo" | "erro">("idle");
  const cancelado = useRef(false);

  const { fmt } = useMoeda();
  const casas = moeda === "BRL" ? 2 : 0;
  const exibido =
    texto ??
    paraExibicao(vidro.custo_unitario).toLocaleString(moeda === "BRL" ? "pt-BR" : "de-DE", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });

  const area =
    vidro.largura_chapa_m && vidro.altura_chapa_m ? vidro.largura_chapa_m * vidro.altura_chapa_m : null;

  async function confirmar() {
    if (cancelado.current) {
      cancelado.current = false;
      setTexto(null);
      return;
    }
    if (texto === null) return;
    const lido = lerNumero(texto);
    if (lido === null || lido < 0) {
      setEstado("erro");
      return;
    }
    const n = paraBanco(lido);
    if (n === Math.round(vidro.custo_unitario)) {
      setTexto(null);
      setEstado("idle");
      return;
    }
    setEstado("salvando");
    const ok = await onSalvarPreco(vidro.id, n);
    setEstado(ok ? "salvo" : "erro");
    if (ok) {
      setTexto(null);
      setTimeout(() => setEstado("idle"), 1500);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3">
        {vidro.nome}
        {vidro.cor_acabamento ? <span className="text-text-muted"> — {vidro.cor_acabamento}</span> : null}
      </td>
      <td className="py-2 pr-3 num text-text-muted">
        {area ? `${vidro.largura_chapa_m}×${vidro.altura_chapa_m} m` : "—"}
      </td>
      <td className="py-2 pr-3 num text-right text-text-muted">
        {area && vidro.custo_unitario > 0 ? fmt(area * vidro.custo_unitario) : "—"}
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs w-12 text-right">
            {estado === "salvando" && <span className="text-text-faint">salvando…</span>}
            {estado === "salvo" && <span className="text-status-ok">salvo ✓</span>}
            {estado === "erro" && <span className="text-status-danger">erro</span>}
          </span>
          <input
            inputMode="decimal"
            aria-label={`Preço por m² — ${vidro.nome}`}
            className={`input-field num text-right w-28 ${vidro.custo_unitario <= 0 && texto === null ? "border-status-warn" : ""}`}
            value={exibido}
            onFocus={(e) => {
              setEstado("idle");
              setTexto(vidro.custo_unitario > 0 ? textoEdicao(vidro.custo_unitario) : "");
              e.currentTarget.select();
            }}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelado.current = true;
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </td>
      <td className="py-2 text-right">
        <button type="button" onClick={() => onEditar(vidro.id)} className="text-xs text-ink hover:underline">
          Editar
        </button>
      </td>
    </tr>
  );
}
