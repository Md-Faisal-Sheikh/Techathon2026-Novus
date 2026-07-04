function Desk({ cx, cy }) {
  return (
    <g>
      <rect x={cx - 24} y={cy - 5} width="48" height="27" rx="3" fill="#a9825a" />
      <rect x={cx - 24} y={cy - 5} width="48" height="6" fill="#8c6942" />
      <rect x={cx - 8} y={cy - 2} width="16" height="10" rx="1.5" fill="#2b3140" />
      <rect x={cx - 9} y={cy + 21} width="18" height="12" rx="4" fill="#5b6472" />
    </g>
  );
}

// Top-view sofa centred at (cx,cy). Canonical: back along the top edge, seats
// face down. rot: 0=back-top, 180=back-bottom, -90=back-left, 90=back-right.
function Sofa({ cx, cy, w, d, seats, rot = 0 }) {
  const arm = Math.min(12, w * 0.16);
  const backH = d * 0.3;
  const seatW = (w - 2 * arm) / seats;
  const cushions = [];
  for (let i = 0; i < seats; i++) {
    const sx = -w / 2 + arm + i * seatW;
    cushions.push(
      <rect key={`s${i}`} x={sx + 1.5} y={-d / 2 + backH + 1} width={seatW - 3} height={d - backH - 3} rx="3" fill="#c6a982" />
    );
    cushions.push(
      <rect key={`b${i}`} x={sx + 1.5} y={-d / 2 + 2} width={seatW - 3} height={backH - 1} rx="2.5" fill="#ad8c65" />
    );
  }
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx="7" fill="#7f5f40" />
      <rect x={-w / 2} y={-d / 2} width={arm} height={d} rx="6" fill="#956f4b" />
      <rect x={w / 2 - arm} y={-d / 2} width={arm} height={d} rx="6" fill="#956f4b" />
      {cushions}
    </g>
  );
}

export default function Furniture({ room }) {
  // Drawing room: a 3-seat sofa down the left wall with a rug in front of it.
  if (room.kind === 'lounge') {
    return (
      <>
        <rect x="64" y="150" width="114" height="136" rx="10" fill="#d9c9a8" />
        <Sofa cx={53} cy={198} w={104} d={42} seats={3} rot={-90} />
      </>
    );
  }
  // Work rooms: four desks in a 2×2 arrangement.
  const w = room.x1 - room.x0;
  const h = room.y1 - room.y0;
  const desks = [];
  [0.27, 0.73].forEach((fx) =>
    [0.33, 0.73].forEach((fy) => {
      desks.push(<Desk key={`${fx}-${fy}`} cx={room.x0 + fx * w} cy={room.y0 + fy * h} />);
    })
  );
  return <>{desks}</>;
}
