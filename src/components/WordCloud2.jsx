import React, { useEffect, useMemo, useRef } from "react";
import WordCloud from "wordcloud";

/**
 * WordCloud2
 * - Uses wordcloud2.js (canvas grid-based) for stable, non-overlapping layout
 * - No rotation, single color, strong size contrast, deterministic ordering
 *
 * props:
 *   data: [{ text: string, value: number }]
 *   width?: number (default 900)
 *   height?: number (default 520)
 *   color?: string (default '#3b82f6')
 *   selectedWord?: string (word that's currently selected)
 *   onWordClick?: function
 */
export default function WordCloud2({
  data = [],
  width = 900,
  height = 520,
  color = "#3b82f6",
  selectedWord = null,
  onWordClick,
}) {
  const canvasRef = useRef(null);
  const wordBoundsRef = useRef([]);

  // Clean and sort once
  const list = useMemo(() => {
    const items = (Array.isArray(data) ? data : [])
      .map(d => ({ text: String(d?.text ?? ""), value: Number(d?.value ?? 0) }))
      .filter(d => d.text && d.value > 0);

    // Sort big -> small for deterministic layout (shuffle=false below)
    items.sort((a, b) => b.value - a.value);

    // Map to [word, weight] format required by wordcloud2
    return items.map(d => [d.text, d.value]);
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !list.length) return;

    // Compute an aggressive but bounded weight factor for strong contrast
    const values = list.map(([, v]) => v);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    // Final font size range in px
    const MIN_PX = 12;
    const MAX_PX = Math.floor(Math.min(width, height) * 0.30); // cap 30% of shorter side

    // Nonlinear mapping: keeps small words readable, big words impactful
    const weightFactor = (v) => {
      const t = (v - min) / Math.max(1, max - min); // 0..1
      // Steeper curve for more separation; clamp to [MIN_PX, MAX_PX]
      const px = MIN_PX + Math.pow(Math.max(0, t), 1.8) * (MAX_PX - MIN_PX);
      return Math.max(MIN_PX, Math.min(MAX_PX, px));
    };

    // Clear any previous render
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Track word positions for click detection
    wordBoundsRef.current = [];

    // Render
    WordCloud(canvas, {
      list,
      gridSize: Math.round((width + height) / 120), // smaller -> denser
      weightFactor,
      color: (word) => {
        // Highlight selected word in amber-500 (yellow), others use default blue
        return word === selectedWord ? '#f59e0b' : color;
      },
      backgroundColor: "rgba(0,0,0,0)",
      rotateRatio: 0,                // no rotation
      rotationSteps: 0,
      shuffle: false,                // deterministic (follows our sorted list)
      drawOutOfBound: false,
      shrinkToFit: true,             // reduce a word if it wouldn't fit (prevents overlap/clipping)
      minSize: 0,                    // allow shrinkToFit to go small if necessary
      clearCanvas: false,            // we clear manually above
      // shapes: 'square',           // default 'circle'; 'square' can feel tighter; try both
      classes: "wc2-word",           // optional CSS class for hover effects
      // NOTE: wordcloud2 places words on a discrete grid -> no overlap by design
      hover: (item, dimension, event) => {
        // Store word bounds for click detection
        if (item && dimension) {
          const existing = wordBoundsRef.current.find(w => w.text === item[0]);
          if (!existing) {
            wordBoundsRef.current.push({
              text: item[0],
              x: dimension.x,
              y: dimension.y,
              w: dimension.w,
              h: dimension.h,
            });
          }
        }
      },
    });

    // No special cleanup needed; canvas is reused
  }, [list, width, height, color, selectedWord]);

  // Add click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onWordClick) return;

    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is within any word bounds
      for (const word of wordBoundsRef.current) {
        if (
          x >= word.x &&
          x <= word.x + word.w &&
          y >= word.y &&
          y <= word.y + word.h
        ) {
          onWordClick(word.text);
          return;
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.style.cursor = 'pointer';

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [onWordClick]);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        // center the canvas visually within the container
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas ref={canvasRef} width={width} height={height} />
      <style>{`
        /* Subtle polish on hover (optional) */
        .wc2-word:hover { filter: brightness(0.8); cursor: default; }
      `}</style>
    </div>
  );
}
