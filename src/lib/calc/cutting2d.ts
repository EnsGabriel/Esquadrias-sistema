// Otimização de corte de chapas (2D) - vidro.
// Algoritmo: Guillotine (cortes retos de ponta a ponta), com heurística
// "melhor encaixe por área restante" - é o método usado pela maioria dos
// softwares de plano de corte de chapa no mercado (permite corte só com serra reta).

export type PecaVidro = {
  id: string;
  larguraM: number;
  alturaM: number;
  rotulo: string;
};

type Retangulo = { x: number; y: number; largura: number; altura: number };

type PecaPosicionada = PecaVidro & { x: number; y: number; rotacionada: boolean };

export type ChapaResultado = {
  chapaIndex: number;
  larguraChapaM: number;
  alturaChapaM: number;
  pecas: PecaPosicionada[];
  areaUtilizadaM2: number;
  aproveitamentoPct: number;
};

export type ResultadoCorte2D = {
  chapas: ChapaResultado[];
  totalChapasUsadas: number;
  aproveitamentoMedioPct: number;
  areaSobraTotalM2: number;
};

const ESPESSURA_CORTE_M = 0.005; // 5mm de perda por corte (disco/serra de vidro)

export function otimizarCorte2D(
  pecas: PecaVidro[],
  larguraChapaM: number,
  alturaChapaM: number,
  espessuraCorteM: number = ESPESSURA_CORTE_M
): ResultadoCorte2D {
  // ordena por área decrescente
  const ordenadas = [...pecas].sort(
    (a, b) => b.larguraM * b.alturaM - a.larguraM * a.alturaM
  );

  const chapas: { livres: Retangulo[]; pecas: PecaPosicionada[] }[] = [];

  for (const peca of ordenadas) {
    let colocada = false;

    for (const chapa of chapas) {
      const encaixe = encontrarMelhorEspaco(chapa.livres, peca, espessuraCorteM);
      if (encaixe) {
        posicionarPeca(chapa, peca, encaixe, espessuraCorteM);
        colocada = true;
        break;
      }
    }

    if (!colocada) {
      const novaChapa = {
        livres: [{ x: 0, y: 0, largura: larguraChapaM, altura: alturaChapaM }],
        pecas: [] as PecaPosicionada[],
      };
      const encaixe = encontrarMelhorEspaco(novaChapa.livres, peca, espessuraCorteM);
      if (encaixe) {
        posicionarPeca(novaChapa, peca, encaixe, espessuraCorteM);
        chapas.push(novaChapa);
      } else {
        // peça maior que a chapa inteira - registra mesmo assim para o usuário ver o problema
        novaChapa.pecas.push({ ...peca, x: 0, y: 0, rotacionada: false });
        chapas.push(novaChapa);
      }
    }
  }

  const chapasResultado: ChapaResultado[] = chapas.map((c, idx) => {
    const areaUtil = c.pecas.reduce((acc, p) => acc + p.larguraM * p.alturaM, 0);
    const areaChapa = larguraChapaM * alturaChapaM;
    return {
      chapaIndex: idx + 1,
      larguraChapaM,
      alturaChapaM,
      pecas: c.pecas,
      areaUtilizadaM2: Number(areaUtil.toFixed(4)),
      aproveitamentoPct: Number(((areaUtil / areaChapa) * 100).toFixed(1)),
    };
  });

  const areaChapaTotal = chapasResultado.length * larguraChapaM * alturaChapaM;
  const areaUtilTotal = chapasResultado.reduce((acc, c) => acc + c.areaUtilizadaM2, 0);

  return {
    chapas: chapasResultado,
    totalChapasUsadas: chapasResultado.length,
    aproveitamentoMedioPct:
      areaChapaTotal > 0 ? Number(((areaUtilTotal / areaChapaTotal) * 100).toFixed(1)) : 0,
    areaSobraTotalM2: Number((areaChapaTotal - areaUtilTotal).toFixed(3)),
  };
}

function encontrarMelhorEspaco(
  livres: Retangulo[],
  peca: PecaVidro,
  corte: number
): { retangulo: Retangulo; rotacionada: boolean } | null {
  let melhor: { retangulo: Retangulo; rotacionada: boolean; sobra: number } | null = null;

  for (const r of livres) {
    // sem rotação
    if (peca.larguraM + corte <= r.largura && peca.alturaM + corte <= r.altura) {
      const sobra = r.largura * r.altura - peca.larguraM * peca.alturaM;
      if (!melhor || sobra < melhor.sobra) melhor = { retangulo: r, rotacionada: false, sobra };
    }
    // com rotação 90°
    if (peca.alturaM + corte <= r.largura && peca.larguraM + corte <= r.altura) {
      const sobra = r.largura * r.altura - peca.larguraM * peca.alturaM;
      if (!melhor || sobra < melhor.sobra) melhor = { retangulo: r, rotacionada: true, sobra };
    }
  }

  return melhor ? { retangulo: melhor.retangulo, rotacionada: melhor.rotacionada } : null;
}

function posicionarPeca(
  chapa: { livres: Retangulo[]; pecas: PecaPosicionada[] },
  peca: PecaVidro,
  encaixe: { retangulo: Retangulo; rotacionada: boolean },
  corte: number
) {
  const r = encaixe.retangulo;
  const largura = (encaixe.rotacionada ? peca.alturaM : peca.larguraM) + corte;
  const altura = (encaixe.rotacionada ? peca.larguraM : peca.alturaM) + corte;

  chapa.pecas.push({
    ...peca,
    x: r.x,
    y: r.y,
    rotacionada: encaixe.rotacionada,
  });

  // remove o retângulo usado e divide o espaço restante (guillotine split)
  chapa.livres = chapa.livres.filter((f) => f !== r);

  const restanteDireita: Retangulo = {
    x: r.x + largura,
    y: r.y,
    largura: r.largura - largura,
    altura: altura,
  };
  const restanteBaixo: Retangulo = {
    x: r.x,
    y: r.y + altura,
    largura: r.largura,
    altura: r.altura - altura,
  };

  if (restanteDireita.largura > 0.01 && restanteDireita.altura > 0.01) {
    chapa.livres.push(restanteDireita);
  }
  if (restanteBaixo.largura > 0.01 && restanteBaixo.altura > 0.01) {
    chapa.livres.push(restanteBaixo);
  }
}
