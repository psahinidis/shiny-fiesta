import React, { useMemo, useState } from "react";
import WordCloud2 from "./components/WordCloud2";
import JournalPanel from "./components/JournalPanel";

const STORAGE_KEY = "activity-tracker:sessions:v1";
const DATE_KEY    = "activity-tracker:lastDate:v1";
const JOURNAL_KEY = "activity-tracker:journal:v1";

/* ---------------- date helpers ---------------- */
const toISODate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
const pretty = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/* aggregate a day's sessions -> [{text,value}] */
function aggregateForDate(sessions, isoDate) {
  const map = new Map();
  for (const s of sessions) {
    if (s.dateISO !== isoDate) continue;
    const key = s.activity.trim();
    map.set(key, (map.get(key) || 0) + s.minutes);
  }
  return Array.from(map, ([text, value]) => ({ text, value }));
}

export default function App() {
  /** Load from localStorage synchronously (strict-mode safe) */
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [dateISO, setDateISO] = useState(() => {
    try {
      return localStorage.getItem(DATE_KEY) || toISODate(new Date());
    } catch {
      return toISODate(new Date());
    }
  });

  // Load journal entries from localStorage
  const [journalEntries, setJournalEntries] = useState(() => {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Journal panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");

  // simple form state
  const [activity, setActivity] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState("");

  /** Save on change */
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  /** Remember last viewed date */
  React.useEffect(() => {
    try {
      localStorage.setItem(DATE_KEY, dateISO);
    } catch {}
  }, [dateISO]);

  /** Save journal entries on change */
  React.useEffect(() => {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalEntries));
    } catch {}
  }, [journalEntries]);

  const todayISO = toISODate(new Date());
  const isFuture = dateISO > todayISO;        // ISO YYYY-MM-DD compares correctly as strings
  const atToday  = dateISO === todayISO;

  const cloudData = useMemo(() => aggregateForDate(sessions, dateISO), [sessions, dateISO]);

  function addSession(e) {
    e.preventDefault();
    setError("");
    if (isFuture) {
      return setError("You can’t add sessions for a future date.");
    }
    const name = activity.trim();
    const mins = Number(minutes);
    if (!name) return setError("Enter an activity.");
    if (!Number.isFinite(mins) || mins <= 0) return setError("Minutes must be > 0.");

    const newSession = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      activity: name,
      minutes: mins,
      dateISO,
    };
    setSessions(prev => [...prev, newSession]);
    setActivity("");
    setMinutes("");
  }

  function clearDay() {
    if (!confirm(`Clear all entries for ${pretty(dateISO)}?`)) return;
    setSessions(prev => prev.filter(s => s.dateISO !== dateISO));
  }

  function clearAll() {
    if (!confirm("Clear ALL saved sessions (all days)?")) return;
    setSessions([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function handleWordClick(word) {
    setSelectedWord(word);
    setIsPanelOpen(true);
  }

  function handleClosePanel() {
    setIsPanelOpen(false);
    setSelectedWord("");
  }

  function handleSaveJournalEntry(entry) {
    setJournalEntries(prev => [...prev, entry]);
  }

  function handleUpdateJournalEntry(entryId, newText) {
    setJournalEntries(prev =>
      prev.map(entry =>
        entry.id === entryId
          ? { ...entry, text: newText, timestamp: new Date().toISOString() }
          : entry
      )
    );
  }

  function handleDeleteJournalEntry(entryId) {
    setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
  }

  // Filter journal entries for the selected word and current date
  const currentJournalEntries = useMemo(() => {
    return journalEntries.filter(
      entry => entry.word === selectedWord && entry.dateISO === dateISO
    );
  }, [journalEntries, selectedWord, dateISO]);

  // Get total minutes for the selected word on current date
  const selectedWordMinutes = useMemo(() => {
    const wordData = cloudData.find(item => item.text === selectedWord);
    return wordData ? wordData.value : 0;
  }, [cloudData, selectedWord]);

  // button styles
  const btn = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    cursor: "pointer",
  };
  const btnDisabled = { ...btn, opacity: 0.5, cursor: "not-allowed" };

  return (
    <div style={{ padding: "28px 20px", maxWidth: 1100, margin: "0 auto" }}>
      {/* header: date nav + picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginRight: "auto" }}>Activity Tracker</h1>

        {/* Left arrow (prev day) */}
        <button
          style={btn}
          onClick={() => setDateISO(d => addDays(d, -1))}
          aria-label="Previous day"
        >
          ◀︎
        </button>

        {/* Date label */}
        <div title={dateISO} style={{ minWidth: 220, textAlign: "center", fontWeight: 700 }}>
          {pretty(dateISO)}
        </div>

        {/* RIGHT ARROW goes here (swapped with Today) */}
        <button
          style={atToday ? btnDisabled : btn}
          onClick={() => !atToday && setDateISO(d => (d >= todayISO ? d : addDays(d, +1)))}
          aria-label="Next day"
          disabled={atToday}
          title={atToday ? "Already at today" : "Next day"}
        >
          ▶︎
        </button>

        {/* TODAY button moves to the right-arrow’s old position */}
        <button
          style={btn}
          onClick={() => setDateISO(todayISO)}
          title="Jump to today"
        >
          Today
        </button>

        {/* Date picker (cannot choose a future date) */}
        <input
          type="date"
          value={dateISO}
          max={todayISO}
          onChange={(e) => {
            const v = e.target.value;
            setDateISO(v > todayISO ? todayISO : v);
          }}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd" }}
        />
      </div>

      {/* Add session form */}
      <form
        onSubmit={addSession}
        style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}
      >
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, color: "#667085" }}>Activity</span>
          <input
            type="text"
            placeholder="e.g., Reading"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #D0D5DD", borderRadius: 8, minWidth: 220 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, color: "#667085" }}>Minutes</span>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 25"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #D0D5DD", borderRadius: 8, width: 120 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: isFuture ? "#9CA3AF" : "#1D4ED8",
            color: "#fff",
            border: 0,
            cursor: isFuture ? "not-allowed" : "pointer",
          }}
          disabled={isFuture}
          title={isFuture ? "Can't add to a future date" : "Add session"}
        >
          Add session
        </button>

        {error && <div style={{ color: "#B42318", fontSize: 13 }}>{error}</div>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" onClick={clearDay} style={btn}>
            Clear this day
          </button>
          <button type="button" onClick={clearAll} style={btn}>
            Clear ALL
          </button>
        </div>
      </form>

      {/* Cloud */}
      <div style={{ marginTop: 16 }}>
        {cloudData.length === 0 ? (
          <p style={{ color: "#667085" }}>
            No activities logged for {pretty(dateISO)} — add one above (or switch dates).
          </p>
        ) : (
          <WordCloud2 
            data={cloudData} 
            width={1000} 
            height={560}
            selectedWord={selectedWord}
            onWordClick={handleWordClick}
          />
        )}
      </div>

      {/* Journal Panel */}
      <JournalPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        selectedWord={selectedWord}
        dateISO={dateISO}
        totalMinutes={selectedWordMinutes}
        entries={currentJournalEntries}
        onSave={handleSaveJournalEntry}
        onUpdate={handleUpdateJournalEntry}
        onDelete={handleDeleteJournalEntry}
      />
    </div>
  );
}