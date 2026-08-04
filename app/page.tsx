"use client";

import { useMemo, useState } from "react";

const bear = [
  "0000000000000000000000000000000000000MMMMMMMMM0000",
  "0000000000000000000000000000000000MMMMMMMMMMMM0000",
  "00000000000000000000000000000000BBBBBMMMMMMM000000",
  "000001100000000000000000000000BBBBBBBBBB0000000000",
  "0000111100000000000000000000CCCCCCCCBBBB0000000000",
  "0001121100000000000000000CCCCCCCCCCCCC000000000000",
  "00011155200000000000000GGGGGGGGGGGGCCC000000000000",
  "00001555334RRRRRYYYYYGGGGGGGGGGGGGG000000000000000",
  "000011510000000RRRRRYYYYYYYYYYYYGGG000000000000000",
  "000115511000000000RRRRRRYYYYYYYY000000000000000000",
  "0011155511000000000000RRRRR00000000000000000000000",
  "01115555510000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "01111555110000000000000000000000000000000000000000",
  "00111111100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "01110011100000000000000000000000000000000000000000",
];

const colors: Record<string, string> = { "1": "#af5f00", "5": "#af875f", "2": "#171717", "3": "#f7f7f7", "4": "#ff3b30", R: "#ff4d45", Y: "#ffd449", G: "#5de38c", C: "#63d9ff", B: "#6988ff", M: "#f178ff" };
const symbols = Object.keys(colors);

export default function Home() {
  const [frame, setFrame] = useState(0);
  const [selected, setSelected] = useState("M");
  const [grid, setGrid] = useState(bear);
  const [sceneMode, setSceneMode] = useState("Loop 30s");
  const visible = useMemo(() => grid.map((row, y) => row.split("").map((cell, x) => ({ cell, hide: "RGYCBM".includes(cell) && (x + frame) % 2 === 0, x, y }))), [grid, frame]);
  function paint(y: number, x: number) { setGrid((old) => old.map((row, rowIndex) => rowIndex === y ? `${row.slice(0, x)}${row[x] === selected ? "0" : selected}${row.slice(x + 1)}` : row)); }
  return <main>
    <header><div><p className="eyebrow">LOCAL AI-NATIVE PIXEL STUDIO</p><h1>Character <i>motion</i>, clean alpha.</h1></div><div className="header-actions"><button className="quiet">Open docs</button><button className="primary">Export for Premiere</button></div></header>
    <section className="workspace">
      <aside className="library"><div className="side-title"><span>Characters</span><button>+</button></div><button className="character active"><span className="mini-bear">▟</span><span><b>Rainbow Bear</b><small>4 frames · 12 fps</small></span></button><button className="character"><span className="mini-orb">✦</span><span><b>New character</b><small>Start from a grid</small></span></button><div className="side-note"><b>Ask Codex</b><p>“Make the bear blink and drift upward with rainbow smoke.”</p></div></aside>
      <section className="editor"><div className="editor-bar"><span>bear / frames / <b>{String(frame).padStart(3, "0")}</b></span><span className="status">● Saved source</span></div><div className="stage-wrap"><div className="stage"><div className="checker" /> <div className="pixel-art" style={{ gridTemplateColumns: `repeat(${grid[0].length}, 10px)` }}>{visible.flat().map(({ cell, hide, x, y }) => <button aria-label={`pixel ${x}, ${y}`} onClick={() => paint(y, x)} key={`${x}-${y}`} className="pixel" style={{ background: hide || cell === "0" ? "transparent" : colors[cell] }} />)}</div></div></div>
        <div className="palette"><span>Paint</span><button className={selected === "0" ? "selected" : ""} onClick={() => setSelected("0")}>Erase</button>{symbols.map((symbol) => <button key={symbol} className={selected === symbol ? "selected swatch" : "swatch"} style={{ background: colors[symbol] }} onClick={() => setSelected(symbol)} aria-label={`paint ${symbol}`} />)}</div>
        <div className="timeline"><div className="timeline-head"><span>Scene timeline</span><select value={sceneMode} onChange={(e) => setSceneMode(e.target.value)}><option>Loop 30s</option><option>Compact sprite</option><option>1080p overlay</option></select></div><div className="track"><b>Rainbow Bear</b><div className="ticks">{[0,1,2,3,0,1,2,3,0,1,2,3].map((n, i) => <button onClick={() => setFrame(n)} key={i} className={frame === n ? "key active-key" : "key"}>{n + 1}</button>)}</div></div><div className="track dim"><b>Smoke particles</b><div className="effect-line">palette cycle · alternating cells · trail</div><button className="add-effect">+ Add effect</button></div></div>
      </section>
      <aside className="inspector"><p className="eyebrow">INSPECTOR</p><h2>Rainbow Bear</h2><label>Pixel scale<input type="number" value="24" readOnly /></label><label>Frame rate<input type="number" value="12" readOnly /></label><div className="rule" /><p className="eyebrow">EFFECTS</p><button className="effect">◌ Alternating smoke <span>ON</span></button><button className="effect">✦ Palette cycle <span>ON</span></button><button className="effect">↗ Drift <span>+6 px</span></button><div className="export-card"><b>{sceneMode}</b><small>ProRes 4444 · Alpha</small><button className="primary">Render scene</button></div></aside>
    </section>
    <footer><span><b>Tip:</b> edit here for ideas, then ask Codex or run <code>npm run render -- bear</code> for the production alpha files.</span><span>PNG sequence + MOV · no keying</span></footer>
  </main>;
}
