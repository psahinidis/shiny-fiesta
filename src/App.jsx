import React, { useMemo, useState } from "react";
import WordCloud2 from "./components/WordCloud2";
import JournalPanel from "./components/JournalPanel";

const STORAGE_KEY = "activity-tracker:sessions:v1";
const DATE_KEY    = "activity-tracker:lastDate:v1";
const JOURNAL_KEY = "activity-tracker:journal:v1";
const ACTIVITY_USAGE_KEY = "activity-tracker:activityUsage:v1";
const ACTIVITY_NAMES_KEY = "activity-tracker:activityNames:v1";

/* ---------------- date helpers ---------------- */
const toISODate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ---------------- activity name helpers ---------------- */
// Convert activity name to lowercase for comparison (prevents "Running" vs "running" duplicates)
const normalizeActivityName = (name) => {
  return name.trim().toLowerCase();
};

// Get the display name for a normalized activity name
const getDisplayName = (normalizedName, activityNames) => {
  return activityNames[normalizedName] || normalizedName;
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

/* aggregate a day's sessions -> [{text,value}] - groups by normalized activity names */
function aggregateForDate(sessions, isoDate, activityNames) {
  const map = new Map();
  for (const s of sessions) {
    if (s.dateISO !== isoDate) continue;
    // Use normalized name as key to group "Running" and "running" together
    const normalizedKey = normalizeActivityName(s.activity);
    map.set(normalizedKey, (map.get(normalizedKey) || 0) + s.minutes);
  }
  // Convert back to display names for the word cloud
  return Array.from(map, ([normalizedKey, value]) => ({ 
    text: getDisplayName(normalizedKey, activityNames), 
    value 
  }));
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

  // Activity dropdown state - tracks whether dropdown is visible and what user has typed
  const [showDropdown, setShowDropdown] = useState(false);
  const [activityInput, setActivityInput] = useState("");

  // Load activity usage data from localStorage - tracks when each activity was last used
  const [activityUsage, setActivityUsage] = useState(() => {
    try {
      const raw = localStorage.getItem(ACTIVITY_USAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed;
    } catch {
      return {};
    }
  });

  // Load activity name mappings - stores normalizedName -> displayName mappings
  const [activityNames, setActivityNames] = useState(() => {
    try {
      const raw = localStorage.getItem(ACTIVITY_NAMES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed;
    } catch {
      return {};
    }
  });

  // simple form state
  const [activity, setActivity] = useState("");
  const [hours, setHours] = useState("");
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

  /** Save activity usage data on change */
  React.useEffect(() => {
    try {
      localStorage.setItem(ACTIVITY_USAGE_KEY, JSON.stringify(activityUsage));
    } catch {}
  }, [activityUsage]);

  /** Save activity name mappings on change */
  React.useEffect(() => {
    try {
      localStorage.setItem(ACTIVITY_NAMES_KEY, JSON.stringify(activityNames));
    } catch {}
  }, [activityNames]);

  const todayISO = toISODate(new Date());
  const isFuture = dateISO > todayISO;        // ISO YYYY-MM-DD compares correctly as strings
  const atToday  = dateISO === todayISO;

  const cloudData = useMemo(() => aggregateForDate(sessions, dateISO, activityNames), [sessions, dateISO, activityNames]);

  // Get all unique activities from all sessions and sort by most recently used
  const allActivities = useMemo(() => {
    // Extract all unique normalized activity names from sessions
    const uniqueNormalizedActivities = [...new Set(sessions.map(session => normalizeActivityName(session.activity)))];
    
    // Convert normalized names back to display names for dropdown
    const displayActivities = uniqueNormalizedActivities.map(normalizedName => 
      getDisplayName(normalizedName, activityNames)
    );
    
    // Sort activities by most recently used first, then alphabetically
    return displayActivities.sort((a, b) => {
      const aNormalized = normalizeActivityName(a);
      const bNormalized = normalizeActivityName(b);
      const aTime = activityUsage[aNormalized] || 0; // Get last used timestamp, default to 0 (oldest)
      const bTime = activityUsage[bNormalized] || 0;
      
      // If both have timestamps, sort by most recent first (higher timestamp = more recent)
      if (aTime > 0 && bTime > 0) {
        return bTime - aTime;
      }
      
      // If only one has timestamp, prioritize the one with timestamp
      if (aTime > 0 && bTime === 0) return -1;
      if (bTime > 0 && aTime === 0) return 1;
      
      // If neither has timestamp, sort alphabetically (case-insensitive)
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [sessions, activityUsage, activityNames]);

  // Filter activities based on what user has typed in the input
  const filteredActivities = useMemo(() => {
    if (!activityInput.trim()) return allActivities;
    
    // Filter activities that contain the user's input (case-insensitive)
    return allActivities.filter(activity => 
      activity.toLowerCase().includes(activityInput.toLowerCase())
    );
  }, [allActivities, activityInput]);

  function addSession(e) {
    e.preventDefault();
    setError("");
    if (isFuture) {
      return setError("You can't add sessions for a future date.");
    }
    const name = activity.trim();
    
    // Convert hours and minutes to total minutes
    const hoursValue = Number(hours) || 0; // Default to 0 if empty
    const minutesValue = Number(minutes) || 0; // Default to 0 if empty
    const totalMinutes = (hoursValue * 60) + minutesValue;
    
    // Validation
    if (!name) return setError("Enter an activity.");
    if (!Number.isFinite(hoursValue) || hoursValue < 0) return setError("Hours must be >= 0.");
    if (!Number.isFinite(minutesValue) || minutesValue < 0 || minutesValue > 59) {
      return setError("Minutes must be between 0 and 59.");
    }
    if (totalMinutes <= 0) return setError("Total time must be greater than 0.");

    // Normalize the activity name to prevent duplicates like "Running" vs "running"
    const normalizedName = normalizeActivityName(name);
    
    // Check if this normalized activity already exists
    const existingActivity = sessions.find(session => 
      normalizeActivityName(session.activity) === normalizedName && session.dateISO === dateISO
    );
    
    if (existingActivity) {
      return setError(`Activity "${getDisplayName(normalizedName, activityNames)}" already exists for this date.`);
    }

    // Record that this activity was just used (update timestamp using normalized name)
    const currentTime = Date.now();
    setActivityUsage(prev => ({
      ...prev,
      [normalizedName]: currentTime
    }));

    // Store the display name mapping (preserve original casing)
    setActivityNames(prev => ({
      ...prev,
      [normalizedName]: name // Store original casing as display name
    }));

    const newSession = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      activity: name, // Store original casing in session
      minutes: totalMinutes, // Store normalized total minutes
      dateISO,
    };
    setSessions(prev => [...prev, newSession]);
    
    // Clear all form fields after successful submission
    setActivity("");
    setHours("");
    setMinutes("");
    setActivityInput(""); // Clear the input field
    setShowDropdown(false); // Hide dropdown after selection
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

  function handleDeleteActivity() {
    if (!selectedWord) return;
    
    // Normalize selected word for comparison to match different casings
    const normalizedSelected = normalizeActivityName(selectedWord);
    
    // Delete all sessions for this activity on this date (normalize for comparison)
    setSessions(prev => prev.filter(session => 
      !(normalizeActivityName(session.activity) === normalizedSelected && session.dateISO === dateISO)
    ));
    
    // Delete all journal entries for this activity on this date (normalize for comparison)
    setJournalEntries(prev => prev.filter(entry => 
      !(normalizeActivityName(entry.word) === normalizedSelected && entry.dateISO === dateISO)
    ));
    
    // Close the panel
    setIsPanelOpen(false);
    setSelectedWord("");
  }

  // Handle when user clicks on activity input field - show dropdown
  function handleActivityFocus() {
    setShowDropdown(true);
    setActivityInput(activity); // Sync input with current activity value
  }

  // Handle when user types in activity input - filter dropdown options
  function handleActivityChange(e) {
    const value = e.target.value;
    setActivity(value);
    setActivityInput(value);
    setShowDropdown(true); // Keep dropdown open while typing
  }

  // Handle when user selects an activity from dropdown
  function handleActivitySelect(selectedActivity) {
    setActivity(selectedActivity);
    setActivityInput(selectedActivity);
    setShowDropdown(false);
    
    // Record that this activity was just used (update timestamp using normalized name)
    const normalizedName = normalizeActivityName(selectedActivity);
    const currentTime = Date.now();
    setActivityUsage(prev => ({
      ...prev,
      [normalizedName]: currentTime
    }));
  }

  // Handle when user clicks outside dropdown - hide it
  function handleActivityBlur() {
    // Use setTimeout to allow click events on dropdown items to fire first
    setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  }

  // Filter journal entries for the selected word and current date
  // Use normalized comparison to match "Running" with "running" entries
  const currentJournalEntries = useMemo(() => {
    if (!selectedWord) return [];
    const normalizedSelected = normalizeActivityName(selectedWord);
    return journalEntries.filter(
      entry => normalizeActivityName(entry.word) === normalizedSelected && entry.dateISO === dateISO
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
        <label style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <span style={{ fontSize: 12, color: "#667085" }}>Activity</span>
          <input
            type="text"
            placeholder="e.g., Reading"
            value={activity}
            onChange={handleActivityChange}
            onFocus={handleActivityFocus}
            onBlur={handleActivityBlur}
            style={{ 
              padding: "8px 10px", 
              border: "1px solid #D0D5DD", 
              borderRadius: 8, 
              minWidth: 220,
              position: "relative",
              zIndex: 1
            }}
          />
          
          {/* Activity dropdown - only show when dropdown is open and there are filtered activities */}
          {showDropdown && filteredActivities.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              border: "1px solid #D0D5DD",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              maxHeight: 200,
              overflowY: "auto",
              zIndex: 10,
              marginTop: 2
            }}>
              {filteredActivities.map((activityName, index) => (
                <div
                  key={index}
                  onClick={() => handleActivitySelect(activityName)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: index < filteredActivities.length - 1 ? "1px solid #f0f0f0" : "none",
                    fontSize: 14,
                    color: "#374151"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  {activityName}
                </div>
              ))}
            </div>
          )}
        </label>

        {/* Time input fields - separate hours and minutes */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, color: "#667085", marginBottom: 4 }}>Hours</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{ 
                padding: "8px 10px", 
                border: "1px solid #D0D5DD", 
                borderRadius: 8, 
                width: 80,
                fontSize: 14
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, color: "#667085", marginBottom: 4 }}>Minutes</span>
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              placeholder="0"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              style={{ 
                padding: "8px 10px", 
                border: "1px solid #D0D5DD", 
                borderRadius: 8, 
                width: 80,
                fontSize: 14
              }}
            />
          </label>
        </div>

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
        onDeleteActivity={handleDeleteActivity}
      />
    </div>
  );
}