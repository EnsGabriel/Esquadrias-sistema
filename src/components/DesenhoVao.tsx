export default function DesenhoVao({
  larguraMm,
  alturaMm,
  temVidro,
}: {
  larguraMm: number;
  alturaMm: number;
  temVidro: boolean;
}) {
  const padding = 50;
  const boxMaxW = 320;
  const boxMaxH = 260;

  const escala = Math.min(boxMaxW / Math.max(larguraMm, 1), boxMaxH / Math.max(alturaMm, 1));
  const w = larguraMm * escala;
  const h = alturaMm * escala;

  const viewW = w + padding * 2;
  const viewH = h + padding * 2 + 30;
  const ox = padding;
  const oy = padding;

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-full">
      {/* moldura do perfil */}
      <rect x={ox} y={oy} width={w} height={h} fill="none" stroke="#16233F" strokeWidth={4} />
      {/* vidro */}
      {temVidro && (
        <rect
          x={ox + 8}
          y={oy + 8}
          width={Math.max(w - 16, 0)}
          height={Math.max(h - 16, 0)}
          fill="#C9D6E4"
          fillOpacity={0.35}
          stroke="#8AA0BC"
          strokeWidth={1}
        />
      )}

      {/* cota largura (embaixo) */}
      <line x1={ox} y1={oy + h + 20} x2={ox + w} y2={oy + h + 20} stroke="#5B6472" strokeWidth={1} />
      <line x1={ox} y1={oy + h + 15} x2={ox} y2={oy + h + 25} stroke="#5B6472" strokeWidth={1} />
      <line x1={ox + w} y1={oy + h + 15} x2={ox + w} y2={oy + h + 25} stroke="#5B6472" strokeWidth={1} />
      <text x={ox + w / 2} y={oy + h + 38} textAnchor="middle" fontSize="13" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#1B2432">
        {larguraMm} mm
      </text>

      {/* cota altura (esquerda) */}
      <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy + h} stroke="#5B6472" strokeWidth={1} />
      <line x1={ox - 25} y1={oy} x2={ox - 15} y2={oy} stroke="#5B6472" strokeWidth={1} />
      <line x1={ox - 25} y1={oy + h} x2={ox - 15} y2={oy + h} stroke="#5B6472" strokeWidth={1} />
      <text
        x={ox - 32}
        y={oy + h / 2}
        textAnchor="middle"
        fontSize="13"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#1B2432"
        transform={`rotate(-90 ${ox - 32} ${oy + h / 2})`}
      >
        {alturaMm} mm
      </text>
    </svg>
  );
}
