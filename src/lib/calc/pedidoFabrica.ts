import { PERFIS_NOVA } from "@/lib/perfisNova";
import { TIPOLOGIAS_NOVA, type Tipologia } from "@/lib/tipologiasNova";
import { otimizarCorte1D } from "@/lib/calc/cutting1d";

export type Tratamento = "temperado" | "comum" | "laminado" | "dvh";
export const ROTULO_TRATAMENTO: Record<Tratamento, string> = {
  temperado: "Temperado",
  comum: "Comum",
  laminado: "Laminado",
  dvh: "DVH (duplo)",
};

export type ItemPedido = {
  id: string;
  tipologiaId: string;
  larguraMm: number;
  alturaMm: number;
  eixoMm: number;
  quantidade: number;
  vidroId: string;
  tratamento: Tratamento;
};

export type MaterialPedido = {
  id: string;
  nome: string;
  tipo: string;
  cor_acabamento: string | null;
  espessura_mm: number | null;
  custo_unitario: number;
  kg_por_metro: number | null;
  comprimento_barra_m: number | null;
  unidade: string | null;
};

export type LinhaPerfil = {
  codigo: string;
  nome: string;
  medidaMm: number;
  qtd: number;
  corte: string;
  nota?: string;
  itens: number[];
  pesoKg: number;
};

export type ResumoPerfil = {
  codigo: string;
  nome: string;
  metros: number;
  barras: number;
  compBarraM: number;
  pesoBarrasKg: number;
  custo: number | null; // null = perfil sem preço cadastrado
  maiorQueBarra: boolean;
};

export type LinhaVidro = {
  descricao: string;
  rotulo?: string;
  larguraMm: number;
  alturaMm: number;
  qtd: number;
  areaM2: number;
  itens: number[];
  custo: number | null;
};

export type ResultadoPedido = {
  perfis: LinhaPerfil[];
  resumoPerfis: ResumoPerfil[];
  vidros: LinhaVidro[];
  totais: { pesoKg: number; barras: number; areaVidroM2: number; custoPerfis: number; custoVidros: number };
  avisos: string[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const NOME_PERFIL = new Map(PERFIS_NOVA.map((p) => [p.codigo, p]));

export function achaTipologia(id: string): Tipologia | undefined {
  return TIPOLOGIAS_NOVA.find((t) => t.id === id);
}

export function achaPerfilMaterial(materiais: MaterialPedido[], codigo: string) {
  return materiais.find((m) => m.tipo === "perfil" && m.nome.toUpperCase().includes(codigo));
}

export function calcularPedido(itens: ItemPedido[], materiais: MaterialPedido[]): ResultadoPedido {
  const perfisMap = new Map<string, LinhaPerfil>();
  const vidrosMap = new Map<string, LinhaVidro>();
  const avisos: string[] = [];
  const vidrosPorId = new Map(materiais.filter((m) => m.tipo === "vidro").map((m) => [m.id, m]));

  itens.forEach((item, idx) => {
    const n = idx + 1;
    const tip = achaTipologia(item.tipologiaId);
    if (!tip) return;
    const p = { L: item.larguraMm, H: item.alturaMm, E: item.eixoMm };

    for (const peca of tip.perfis) {
      const medida = r1(peca.formula(p));
      if (!(medida > 0)) {
        avisos.push(`Item ${n}: a medida ${item.larguraMm}×${item.alturaMm} é pequena demais para ${tip.nome} (perfil ${peca.codigo} ficou com ${medida} mm).`);
        continue;
      }
      const info = NOME_PERFIL.get(peca.codigo);
      const qtd = peca.qtd * item.quantidade;
      const chave = `${peca.codigo}|${medida}|${peca.corte}|${peca.nota ?? ""}`;
      const atual = perfisMap.get(chave);
      const peso = (info?.kg_por_metro ?? 0) * (medida / 1000) * qtd;
      if (atual) {
        atual.qtd += qtd;
        atual.pesoKg += peso;
        if (!atual.itens.includes(n)) atual.itens.push(n);
      } else {
        perfisMap.set(chave, {
          codigo: peca.codigo,
          nome: info?.nome ?? peca.codigo,
          medidaMm: medida,
          qtd,
          corte: peca.corte,
          nota: peca.nota,
          itens: [n],
          pesoKg: peso,
        });
      }
    }

    const vidroMat = vidrosPorId.get(item.vidroId);
    const descricaoVidro =
      `${ROTULO_TRATAMENTO[item.tratamento]}` +
      (vidroMat ? ` ${vidroMat.espessura_mm ? vidroMat.espessura_mm + " mm " : ""}${vidroMat.cor_acabamento ?? vidroMat.nome}` : " (vidro não escolhido)");
    for (const v of tip.vidros) {
      const larg = r1(v.largura(p));
      const alt = r1(v.altura(p));
      if (!(larg > 0 && alt > 0)) {
        avisos.push(`Item ${n}: a medida ${item.larguraMm}×${item.alturaMm} é pequena demais para o vidro de ${tip.nome}.`);
        continue;
      }
      const qtd = v.qtd * item.quantidade;
      const chave = `${descricaoVidro}|${v.rotulo ?? ""}|${larg}|${alt}`;
      const atual = vidrosMap.get(chave);
      const area = (larg / 1000) * (alt / 1000) * qtd;
      const custo = vidroMat && vidroMat.custo_unitario > 0 ? area * vidroMat.custo_unitario : null;
      if (atual) {
        atual.qtd += qtd;
        atual.areaM2 += area;
        if (custo !== null) atual.custo = (atual.custo ?? 0) + custo;
        if (!atual.itens.includes(n)) atual.itens.push(n);
      } else {
        vidrosMap.set(chave, { descricao: descricaoVidro, rotulo: v.rotulo, larguraMm: larg, alturaMm: alt, qtd, areaM2: area, itens: [n], custo });
      }
    }
  });

  const perfis = Array.from(perfisMap.values()).sort(
    (a, b) => a.codigo.localeCompare(b.codigo) || b.medidaMm - a.medidaMm
  );
  const vidros = Array.from(vidrosMap.values());

  // Barras e custo por perfil (plano de corte 1D)
  const porCodigo = new Map<string, LinhaPerfil[]>();
  for (const l of perfis) porCodigo.set(l.codigo, [...(porCodigo.get(l.codigo) ?? []), l]);

  const resumoPerfis: ResumoPerfil[] = [];
  for (const [codigo, linhas] of porCodigo) {
    const mat = achaPerfilMaterial(materiais, codigo);
    const info = NOME_PERFIL.get(codigo);
    const kgM = mat?.kg_por_metro ?? info?.kg_por_metro ?? 0;
    const compBarra = mat?.comprimento_barra_m ?? 6;
    const pecas = linhas.flatMap((l, i) =>
      Array.from({ length: l.qtd }, (_, k) => ({ id: `${codigo}-${i}-${k}`, comprimentoM: l.medidaMm / 1000, rotulo: codigo }))
    );
    const corte = otimizarCorte1D(pecas, compBarra);
    const metros = pecas.reduce((a, p) => a + p.comprimentoM, 0);
    const pesoBarrasKg = corte.totalBarrasUsadas * compBarra * kgM;
    let custo: number | null = null;
    if (mat && mat.custo_unitario > 0) {
      if (mat.unidade === "kg") custo = pesoBarrasKg * mat.custo_unitario;
      else if (mat.unidade === "barra") custo = corte.totalBarrasUsadas * mat.custo_unitario;
      else custo = metros * mat.custo_unitario;
    }
    resumoPerfis.push({
      codigo,
      nome: info?.nome ?? codigo,
      metros,
      barras: corte.totalBarrasUsadas,
      compBarraM: compBarra,
      pesoBarrasKg,
      custo,
      maiorQueBarra: linhas.some((l) => l.medidaMm / 1000 > compBarra),
    });
  }
  resumoPerfis.sort((a, b) => a.codigo.localeCompare(b.codigo));

  for (const r of resumoPerfis) {
    if (r.maiorQueBarra) avisos.push(`O perfil ${r.codigo} tem peça maior que a barra de ${r.compBarraM} m. Confira a medida.`);
  }

  const totais = {
    pesoKg: perfis.reduce((a, l) => a + l.pesoKg, 0),
    barras: resumoPerfis.reduce((a, r) => a + r.barras, 0),
    areaVidroM2: vidros.reduce((a, v) => a + v.areaM2, 0),
    custoPerfis: resumoPerfis.reduce((a, r) => a + (r.custo ?? 0), 0),
    custoVidros: vidros.reduce((a, v) => a + (v.custo ?? 0), 0),
  };

  return { perfis, resumoPerfis, vidros, totais, avisos };
}

/** Lê "1200x1000", "1200 x 1000", "1200×1000" ou "1200*1000". */
export function lerMedida(texto: string): { larguraMm: number; alturaMm: number } | null {
  const m = texto.trim().match(/^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const l = Number(m[1].replace(",", "."));
  const h = Number(m[2].replace(",", "."));
  if (!(l > 0 && h > 0)) return null;
  return { larguraMm: l, alturaMm: h };
}
