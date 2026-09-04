// Otimização de corte de barras (1D) - perfis de alumínio.
// Algoritmo: First Fit Decreasing (padrão da indústria para bin packing 1D,
// boa relação qualidade/velocidade - fica a poucos % do ótimo teórico).

export type PecaCorte = {
  id: string;
  comprimentoM: number;
  rotulo: string; // ex: "Item #3 - travessa horizontal"
};

export type BarraResultado = {
  barraIndex: number;
  comprimentoBarraM: number;
  pecas: PecaCorte[];
  sobraM: number;
  aproveitamentoPct: number;
};

export type ResultadoCorte1D = {
  barras: BarraResultado[];
  totalBarrasUsadas: number;
  aproveitamentoMedioPct: number;
  sobraTotalM: number;
  perdaSerraM: number;
};

const ESPESSURA_SERRA_M = 0.003; // 3mm perdidos por corte (serra), valor típico - ajustável

export function otimizarCorte1D(
  pecas: PecaCorte[],
  comprimentoBarraM: number,
  espessuraSerraM: number = ESPESSURA_SERRA_M
): ResultadoCorte1D {
  // ordena decrescente (First Fit Decreasing)
  const ordenadas = [...pecas].sort((a, b) => b.comprimentoM - a.comprimentoM);

  const barras: { pecas: PecaCorte[]; usadoM: number }[] = [];

  for (const peca of ordenadas) {
    let colocada = false;
    for (const barra of barras) {
      const espacoNecessario =
        peca.comprimentoM + (barra.pecas.length > 0 ? espessuraSerraM : 0);
      if (barra.usadoM + espacoNecessario <= comprimentoBarraM) {
        barra.pecas.push(peca);
        barra.usadoM += espacoNecessario;
        colocada = true;
        break;
      }
    }
    if (!colocada) {
      barras.push({ pecas: [peca], usadoM: peca.comprimentoM });
    }
  }

  const barrasResultado: BarraResultado[] = barras.map((b, idx) => {
    const sobra = comprimentoBarraM - b.usadoM;
    return {
      barraIndex: idx + 1,
      comprimentoBarraM,
      pecas: b.pecas,
      sobraM: Number(sobra.toFixed(4)),
      aproveitamentoPct: Number(((b.usadoM / comprimentoBarraM) * 100).toFixed(1)),
    };
  });

  const sobraTotalM = barrasResultado.reduce((acc, b) => acc + b.sobraM, 0);
  const totalUtilM = barrasResultado.reduce(
    (acc, b) => acc + (comprimentoBarraM - b.sobraM),
    0
  );
  const totalDisponivelM = barrasResultado.length * comprimentoBarraM;
  const somaPecasM = ordenadas.reduce((acc, p) => acc + p.comprimentoM, 0);

  return {
    barras: barrasResultado,
    totalBarrasUsadas: barrasResultado.length,
    aproveitamentoMedioPct:
      totalDisponivelM > 0
        ? Number(((totalUtilM / totalDisponivelM) * 100).toFixed(1))
        : 0,
    sobraTotalM: Number(sobraTotalM.toFixed(3)),
    perdaSerraM: Number((totalUtilM - somaPecasM).toFixed(3)),
  };
}
