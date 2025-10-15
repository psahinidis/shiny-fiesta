import React, { useEffect, useState } from 'react';
import WordCloud2 from './components/WordCloud2';

const STORAGE_KEY = 'activity-tracker:items:v1';

export default function App() {
  // items are aggregated entries: [{ text, value }]
  const [items, setItems] = useState([]);
  const [activity, setActivity] = useState('');
  const [minutes, setMinutes] = useState('');

  // load saved items on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setItems(parsed);
    } catch (e) {
      console.warn('Failed to load saved items', e);
    }
  }, []);

  // save whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save items', e);
    }
  }, [items]);

  // add/merge an activity
  function addSession(e) {
    e.preventDefault();
    const name = activity.trim();
    const mins = Number(minutes);
    if (!name || !Number.isFinite(mins) || mins <= 0) return;

    setItems(prev => {
      const idx = prev.findIndex(x => x.text.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], value: next[idx].value + mins };
        return next;
      }
      return [...prev, { text: name, value: mins }];
    });

    setActivity('');
    setMinutes('');
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>Activity Tracker (MVP)</h1>

      <form onSubmit={addSession} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, color: '#555' }}>Activity</label>
          <input
            value={activity}
            onChange={e => setActivity(e.target.value)}
            placeholder="e.g., Reading"
            style={{ padding: '10px 12px', width: 260, border: '1px solid #ddd', borderRadius: 8, fontSize: 16 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, color: '#555' }}>Minutes</label>
          <input
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            placeholder="e.g., 25"
            inputMode="numeric"
            style={{ padding: '10px 12px', width: 160, border: '1px solid #ddd', borderRadius: 8, fontSize: 16 }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: '#2753ff',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 20,
          }}
        >
          Add session
        </button>
      </form>

      {/* The new canvas-based word cloud */}
      <WordCloud2 data={items} width={1000} height={560} color="#111" />

      {/* tiny helper to clear everything while testing */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => { if (confirm('Clear all activities?')) setItems([]); }}
          style={{ background:'#f3f4f6', border:'1px solid #e5e7eb', padding:'8px 12px', borderRadius:8, cursor:'pointer' }}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}