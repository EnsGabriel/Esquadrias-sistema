import { PERFIS_NOVA } from "@/lib/perfisNova";
import { TIPOLOGIAS_NOVA, type PecaPerfil, type Tipologia } from "@/lib/tipologiasNova";
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

type Acumulador = {
  perfisMap: Map<string, LinhaPerfil>;
  vidrosMap: Map<string, LinhaVidro>;
  avisos: string[];
};

function registrarPerfil(acc: Acumulador, peca: PecaPerfil, medida: number, qtd: number, n: number) {
  const info = NOME_PERFIL.get(peca.codigo);
  const chave = `${peca.codigo}|${medida}|${peca.corte}|${peca.nota ?? ""}`;
  const peso = (info?.kg_por_metro ?? 0) * (medida / 1000) * qtd;
  const atual = acc.perfisMap.get(chave);
  if (atual) {
    atual.qtd += qtd;
    atual.pesoKg += peso;
    if (!atual.itens.includes(n)) atual.itens.push(n);
    return;
  }
  acc.perfisMap.set(chave, {
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

function registrarVidro(
  acc: Acumulador,
  rotulo: string | undefined,
  larg: number,
  alt: number,
  qtd: number,
  n: number,
  descricao: string,
  vidroMat?: MaterialPedido
) {
  const chave = `${descricao}|${rotulo ?? ""}|${larg}|${alt}`;
  const area = (larg / 1000) * (alt / 1000) * qtd;
  const custo = vidroMat && vidroMat.custo_unitario > 0 ? area * vidroMat.custo_unitario : null;
  const atual = acc.vidrosMap.get(chave);
  if (atual) {
    atual.qtd += qtd;
    atual.areaM2 += area;
    if (custo !== null) atual.custo = (atual.custo ?? 0) + custo;
    if (!atual.itens.includes(n)) atual.itens.push(n);
    return;
  }
  acc.vidrosMap.set(chave, {
    descricao,
    rotulo,
    larguraMm: larg,
    alturaMm: alt,
    qtd,
    areaM2: area,
    itens: [n],
    custo,
  });
}

function descreverVidro(tratamento: Tratamento, vidroMat?: MaterialPedido): string {
  const base = ROTULO_TRATAMENTO[tratamento];
  if (!vidroMat) return `${base} (vidro não escolhido)`;
  const espessura = vidroMat.espessura_mm ? `${vidroMat.espessura_mm} mm ` : "";
  return `${base} ${espessura}${vidroMat.cor_acabamento ?? vidroMat.nome}`;
}

function processarItem(
  acc: Acumulador,
  item: ItemPedido,
  n: number,
  vidrosPorId: Map<string, MaterialPedido>
) {
  const tip = achaTipologia(item.tipologiaId);
  if (!tip) return;
  const p = { L: item.larguraMm, H: item.alturaMm, E: item.eixoMm };

  for (const peca of tip.perfis) {
    const medida = r1(peca.formula(p));
    if (!(medida > 0)) {
      acc.avisos.push(`Item ${n}: a medida ${item.larguraMm}×${item.alturaMm} é pequena demais para ${tip.nome} (perfil ${peca.codigo} ficou com ${medida} mm).`);
      continue;
    }
    registrarPerfil(acc, peca, medida, peca.qtd * item.quantidade, n);
  }

  const vidroMat = vidrosPorId.get(item.vidroId);
  const descricao = descreverVidro(item.tratamento, vidroMat);
  for (const v of tip.vidros) {
    const larg = r1(v.largura(p));
    const alt = r1(v.altura(p));
    if (!(larg > 0 && alt > 0)) {
      acc.avisos.push(`Item ${n}: a medida ${item.larguraMm}×${item.alturaMm} é pequena demais para o vidro de ${tip.nome}.`);
      continue;
    }
    registrarVidro(acc, v.rotulo, larg, alt, v.qtd * item.quantidade, n, descricao, vidroMat);
  }
}

function custoDasBarras(
  mat: MaterialPedido | undefined,
  metros: number,
  barras: number,
  pesoKg: number
): number | null {
  if (!mat || !(mat.custo_unitario > 0)) return null;
  if (mat.unidade === "kg") return pesoKg * mat.custo_unitario;
  if (mat.unidade === "barra") return barras * mat.custo_unitario;
  return metros * mat.custo_unitario;
}

function resumoDoCodigo(codigo: string, linhas: LinhaPerfil[], materiais: MaterialPedido[]): ResumoPerfil {
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
  return {
    codigo,
    nome: info?.nome ?? codigo,
    metros,
    barras: corte.totalBarrasUsadas,
    compBarraM: compBarra,
    pesoBarrasKg,
    custo: custoDasBarras(mat, metros, corte.totalBarrasUsadas, pesoBarrasKg),
    maiorQueBarra: linhas.some((l) => l.medidaMm / 1000 > compBarra),
  };
}

function resumirPerfis(perfis: LinhaPerfil[], materiais: MaterialPedido[], avisos: string[]): ResumoPerfil[] {
  const porCodigo = new Map<string, LinhaPerfil[]>();
  for (const l of perfis) porCodigo.set(l.codigo, [...(porCodigo.get(l.codigo) ?? []), l]);

  const resumo: ResumoPerfil[] = [];
  for (const [codigo, linhas] of porCodigo) resumo.push(resumoDoCodigo(codigo, linhas, materiais));
  resumo.sort((a, b) => a.codigo.localeCompare(b.codigo));

  for (const r of resumo) {
    if (r.maiorQueBarra) avisos.push(`O perfil ${r.codigo} tem peça maior que a barra de ${r.compBarraM} m. Confira a medida.`);
  }
  return resumo;
}

export function calcularPedido(itens: ItemPedido[], materiais: MaterialPedido[]): ResultadoPedido {
  const acc: Acumulador = { perfisMap: new Map(), vidrosMap: new Map(), avisos: [] };
  const vidrosPorId = new Map(materiais.filter((m) => m.tipo === "vidro").map((m) => [m.id, m]));

  itens.forEach((item, idx) => processarItem(acc, item, idx + 1, vidrosPorId));

  const perfis = Array.from(acc.perfisMap.values()).sort(
    (a, b) => a.codigo.localeCompare(b.codigo) || b.medidaMm - a.medidaMm
  );
  const vidros = Array.from(acc.vidrosMap.values());
  const resumoPerfis = resumirPerfis(perfis, materiais, acc.avisos);

  const totais = {
    pesoKg: perfis.reduce((a, l) => a + l.pesoKg, 0),
    barras: resumoPerfis.reduce((a, r) => a + r.barras, 0),
    areaVidroM2: vidros.reduce((a, v) => a + v.areaM2, 0),
    custoPerfis: resumoPerfis.reduce((a, r) => a + (r.custo ?? 0), 0),
    custoVidros: vidros.reduce((a, v) => a + (v.custo ?? 0), 0),
  };

  return { perfis, resumoPerfis, vidros, totais, avisos: acc.avisos };
}

/** Lê "1200x1000", "1200 x 1000", "1200×1000" ou "1200*1000". */
export function lerMedida(texto: string): { larguraMm: number; alturaMm: number } | null {
  const partes = texto.trim().split(/[xX×*]/);
  if (partes.length !== 2) return null;
  const larguraMm = lerNumeroMedida(partes[0]);
  const alturaMm = lerNumeroMedida(partes[1]);
  if (!(larguraMm > 0 && alturaMm > 0)) return null;
  return { larguraMm, alturaMm };
}

function lerNumeroMedida(txt: string): number {
  const limpo = txt.trim().replace(",", ".");
  const partes = limpo.split(".");
  const apenasDigitos = (p: string) => p.length > 0 && [...p].every((c) => c >= "0" && c <= "9");
  if (partes.length > 2 || !partes.every(apenasDigitos)) return 0;
  return Number(limpo);
}
