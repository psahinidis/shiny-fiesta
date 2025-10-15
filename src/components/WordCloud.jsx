return (
  <div
    style={{
      columns: 3,            // ← masonry-style columns
      columnGap: 24,
      maxWidth: 900,
    }}
  >
    {data
      .slice()
      .sort((a, b) => b.value - a.value) // biggest first
      .map((d, i) => {
        const size = 14 + Math.sqrt(d.value) * 4; // ~14–44px
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginBottom: 12,
              fontSize: size,
              color: 'hsl(215 20% 45%)',
              lineHeight: 1.1,
              breakInside: 'avoid',
            }}
            title={`${d.text}: ${d.value} min`}
          >
            {d.text}
          </span>
        );
      })}
  </div>
);