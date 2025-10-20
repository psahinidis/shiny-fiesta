import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as cloud from 'd3-cloud';

/* ---------- Deterministic RNG: same data -> same layout ---------- */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return (h >>> 0);
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Tunables ---------- */
const FILL = '#111111';           // all-black look
const MIN_SIZE = 14;              // px
const MAX_SIZE_CAP_FRAC = 0.30;   // max font ≈ 30% of min(canvas side)
const SIZE_EXPONENT = 1.8;        // >1 makes small values MUCH smaller (strong contrast)
const FEW_WORDS_SHRINK_4 = 0.85;  // tighten cluster when few words
const FEW_WORDS_SHRINK_8 = 0.92;

/** padding function: bigger words get more spacing to avoid touching */
const paddingFor = d => Math.max(3, Math.round(d.size * 0.08)); // ~8% of font size

export default function D3WordCloud({
  data,
  width = 900,
  height = 520,
  color = "#3b82f6",
  selectedWord = null,
  onWordClick,
  layoutKey, // e.g., "2025-W41" for weekly, "2025-10" for monthly
}) {
  // Normalize input
  const words = useMemo(
    () => (Array.isArray(data) ? data : [])
      .map(d => ({ text: String(d?.text ?? ''), value: Number(d?.value ?? 0) }))
      .filter(d => d.text && d.value > 0),
    [data]
  );

  // Stable key (if caller doesn't pass one)
  const derivedKey = useMemo(() => {
    const sig = words.slice().sort((a,b)=>a.text.localeCompare(b.text))
      .map(w => `${w.text}:${w.value}`).join('|');
    return layoutKey || `auto:${sig}`;
  }, [words, layoutKey]);

  // Slightly shrink canvas if few words (prevents “empty” look)
  const count = words.length;
  const shrink =
    count <= 4 ? FEW_WORDS_SHRINK_4 :
    count <= 8 ? FEW_WORDS_SHRINK_8 : 1;
  const tunedWidth  = Math.round(width  * shrink);
  const tunedHeight = Math.round(height * shrink);

  const [layoutWords, setLayoutWords] = useState([]);
  const runningRef = useRef(false);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!words.length || runningRef.current) {
      if (!words.length) setLayoutWords([]);
      return;
    }
    
    console.log('D3WordCloud: Starting layout with', words.length, 'words');
    runningRef.current = true;

    // Deterministic RNG -> d3-cloud uses it for initial offsets
    const rng = mulberry32(hashString(derivedKey));

    // Scale minutes -> font sizes with STRONG separation
    const maxV = Math.max(...words.map(w => w.value), 1);
    const minV = Math.min(...words.map(w => w.value), 0);
    const norm = v => (v - minV) / Math.max(1, maxV - minV);

    const canvasMin = Math.min(tunedWidth, tunedHeight);
    const MAX_SIZE = Math.max(MIN_SIZE + 8, Math.floor(canvasMin * MAX_SIZE_CAP_FRAC));

    const fontSize = v =>
      MIN_SIZE + Math.pow(Math.max(0, norm(v)), SIZE_EXPONENT) * (MAX_SIZE - MIN_SIZE);

    const prepared = words
      .slice()
      .sort((a, b) => b.value - a.value) // big first helps packing
      .map(w => ({
        text: w.text,
        value: w.value,
        size: fontSize(w.value),
        fill: w.text === selectedWord ? '#f59e0b' : color,
      }));

    const layout = cloud()
      .size([tunedWidth, tunedHeight])
      .words(prepared)
      .padding(paddingFor)        // dynamic padding -> no touching, esp. near BIG words
      .spiral('archimedean')
      .rotate(() => 0)            // keep all horizontal
      .font('Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif')
      .fontSize(d => d.size)
      .random(rng)                // deterministic placement
      .on('end', ws => {
        console.log('D3WordCloud: Layout completed with', ws.length, 'words');
        setLayoutWords(ws);       // NOTE: no post-process "push" (prevents overlaps)
        runningRef.current = false;
      });

    layout.start();
    return () => { try { layout.stop?.(); } catch {} runningRef.current = false; };
  }, [words, tunedWidth, tunedHeight, derivedKey, color, selectedWord]);

  if (!layoutWords.length) {
    console.log('D3WordCloud: No layout words, returning null');
    return null;
  }

  const cx = tunedWidth / 2, cy = tunedHeight / 2;

  // Add click handler
  useEffect(() => {
    if (!onWordClick) return;

    const handleClick = (event) => {
      const textElement = event.target;
      if (textElement.tagName === 'text') {
        const wordText = textElement.textContent;
        onWordClick(wordText);
      }
    };

    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('click', handleClick);
      svg.style.cursor = 'pointer';
    }

    return () => {
      if (svg) {
        svg.removeEventListener('click', handleClick);
      }
    };
  }, [onWordClick]);

  return (
    <svg 
      ref={svgRef}
      width={tunedWidth} 
      height={tunedHeight} 
      role="img" 
      aria-label="Word cloud"
      style={{ cursor: 'pointer' }}
    >
      <g transform={`translate(${cx}, ${cy})`}>
        {layoutWords.map((w, i) => (
          <text
            key={i}
            textAnchor="middle"
            transform={`translate(${w.x || 0}, ${w.y || 0})`}
            style={{
              fontSize: w.size,
              fill: w.fill,
              fontWeight: w.size > 0.8 * Math.max(...layoutWords.map(x => x.size)) ? 900
                        : w.size > 0.5 * Math.max(...layoutWords.map(x => x.size)) ? 800
                        : 700,
              letterSpacing: 0.2,
              userSelect: 'none',
              textRendering: 'geometricPrecision',
              cursor: 'pointer',
            }}
            title={`${w.text}: ${w.value} min`}
          >
            {w.text}
          </text>
        ))}
      </g>
    </svg>
  );
}