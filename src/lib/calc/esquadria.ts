// Cálculo de peso e custo de um item de esquadria, a partir dos componentes
// cadastrados no modelo (perímetro de perfil, travessas, ferragens) e do vidro escolhido.

export type ModelComponent = {
  material_id: string;
  tipo_consumo: "perimetro" | "travessa_h" | "travessa_v" | "unidade";
  fator: number;
  quantidade_fixa: number | null;
};

export type MaterialLite = {
  id: string;
  tipo: "perfil" | "vidro" | "ferragem";
  kg_por_metro: number | null;
  kg_por_m2: number | null;
  custo_unitario: number; // perfil: conforme "unidade" (kg ou barra); vidro: por m²; ferragem: por unidade
  comprimento_barra_m: number | null;
  unidade?: string | null; // perfil: "kg" (preço por kg), "barra" (preço por barra); outro = por metro
};

// Custo de um trecho de perfil conforme a forma como o fornecedor cobra.
export function custoDoPerfil(material: MaterialLite, metros: number): number {
  const preco = material.custo_unitario ?? 0;
  if (material.unidade === "kg") return metros * (material.kg_por_metro ?? 0) * preco;
  if (material.unidade === "barra") return (metros / (material.comprimento_barra_m || 6)) * preco;
  return metros * preco;
}

export type CalculoItemInput = {
  largura_mm: number;
  altura_mm: number;
  quantidade: number;
  components: ModelComponent[];
  materiaisById: Record<string, MaterialLite>;
  vidroMaterial?: MaterialLite | null;
  margemPct: number;
};

export type CalculoItemResultado = {
  perfilMetrosLineares: number;
  vidroAreaM2: number;
  pesoTotalKg: number;
  custoPerfil: number;
  custoVidro: number;
  custoFerragens: number;
  custoTotal: number; // para 1 unidade
  precoVendaUnitario: number;
  custoTotalComQuantidade: number;
  precoVendaTotalComQuantidade: number;
};

export function calcularItem(input: CalculoItemInput): CalculoItemResultado {
  const larguraM = input.largura_mm / 1000;
  const alturaM = input.altura_mm / 1000;
  const perimetroM = 2 * (larguraM + alturaM);

  let perfilMetrosLineares = 0;
  let pesoPerfilKg = 0;
  let custoPerfil = 0;
  let custoFerragens = 0;

  for (const comp of input.components) {
    const material = input.materiaisById[comp.material_id];
    if (!material) continue;

    if (material.tipo === "perfil") {
      let metros = 0;
      if (comp.tipo_consumo === "perimetro") metros = perimetroM * comp.fator;
      else if (comp.tipo_consumo === "travessa_h") metros = larguraM * comp.fator;
      else if (comp.tipo_consumo === "travessa_v") metros = alturaM * comp.fator;

      perfilMetrosLineares += metros;
      pesoPerfilKg += metros * (material.kg_por_metro ?? 0);
      custoPerfil += custoDoPerfil(material, metros);
    }

    if (material.tipo === "ferragem" && comp.tipo_consumo === "unidade") {
      const qty = comp.quantidade_fixa ?? comp.fator;
      custoFerragens += qty * material.custo_unitario;
    }
  }

  const vidroAreaM2 = input.vidroMaterial ? larguraM * alturaM : 0;
  const pesoVidroKg = input.vidroMaterial ? vidroAreaM2 * (input.vidroMaterial.kg_por_m2 ?? 0) : 0;
  const custoVidro = input.vidroMaterial ? vidroAreaM2 * input.vidroMaterial.custo_unitario : 0;

  const pesoTotalKg = pesoPerfilKg + pesoVidroKg;
  const custoTotal = custoPerfil + custoVidro + custoFerragens;
  const precoVendaUnitario = custoTotal * (1 + input.margemPct / 100);

  return {
    perfilMetrosLineares,
    vidroAreaM2,
    pesoTotalKg,
    custoPerfil,
    custoVidro,
    custoFerragens,
    custoTotal,
    precoVendaUnitario,
    custoTotalComQuantidade: custoTotal * input.quantidade,
    precoVendaTotalComQuantidade: precoVendaUnitario * input.quantidade,
  };
}
