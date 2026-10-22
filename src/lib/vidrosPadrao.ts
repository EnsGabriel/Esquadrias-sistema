// Tabela de vidros padrão (preço por m², em guaraníes).
export const VIDROS_PADRAO = [
  { espessura: 6, cor: "Incolor", gs: 179081 },
  { espessura: 6, cor: "Fumê", gs: 201980 },
  { espessura: 8, cor: "Incolor", gs: 194163 },
  { espessura: 8, cor: "Fumê", gs: 214867 },
  { espessura: 10, cor: "Incolor", gs: 228034 },
  { espessura: 10, cor: "Fumê", gs: 267375 },
].map((v) => ({
  nome: `Vidro ${v.espessura} mm ${v.cor}`,
  cor_acabamento: v.cor,
  espessura_mm: v.espessura,
  kg_por_m2: v.espessura * 2.5,
  custo_unitario: v.gs,
}));
