import React, { useMemo, useState } from "react";
import WordCloud2 from "./components/WordCloud2";
import ActivityTrendPanel from "./components/ActivityTrendPanel";

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

/* ---------------- time range filter helpers ---------------- */
// Get the start date for a given time range from a reference date
const getTimeRangeStart = (referenceDate, range) => {
  const ref = new Date(referenceDate + "T00:00:00");
  
  switch (range) {
    case "week":
      // Start of week (Monday)
      const dayOfWeek = ref.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
      ref.setDate(ref.getDate() + mondayOffset);
      break;
    case "month":
      // Start of month
      ref.setDate(1);
      break;
    case "year":
      // Start of year
      ref.setMonth(0, 1);
      break;
    default:
      return referenceDate;
  }
  
  return toISODate(ref);
};

// Get the end date for a given time range from a reference date
const getTimeRangeEnd = (referenceDate, range) => {
  const ref = new Date(referenceDate + "T00:00:00");
  
  switch (range) {
    case "week":
      // End of week (Sunday)
      const dayOfWeek = ref.getDay();
      const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      ref.setDate(ref.getDate() + sundayOffset);
      break;
    case "month":
      // End of month
      ref.setMonth(ref.getMonth() + 1, 0);
      break;
    case "year":
      // End of year
      ref.setMonth(11, 31);
      break;
    default:
      return referenceDate;
  }
  
  return toISODate(ref);
};

// Check if a date falls within a time range
const isDateInRange = (dateISO, referenceDate, range) => {
  const startDate = getTimeRangeStart(referenceDate, range);
  const endDate = getTimeRangeEnd(referenceDate, range);
  return dateISO >= startDate && dateISO <= endDate;
};

// Format weekly date range for display
const formatWeeklyRange = (referenceDate) => {
  const startDate = getTimeRangeStart(referenceDate, "week");
  const endDate = getTimeRangeEnd(referenceDate, "week");
  
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  
  // Check if it's the same week
  if (startDate === endDate) {
    return start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Format range
  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
  const endDay = end.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  } else {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  }
};

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

/* aggregate sessions by time range -> [{text,value}] - groups by normalized activity names */
function aggregateByTimeRange(sessions, referenceDate, timeRange, activityNames) {
  const map = new Map();
  
  // Filter sessions within the time range
  for (const s of sessions) {
    if (!isDateInRange(s.dateISO, referenceDate, timeRange)) continue;
    
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
  
  // time range filter state
  const [timeRange, setTimeRange] = useState("week"); // "week", "month", "year"
  const [selectedActivity, setSelectedActivity] = useState(""); // selected activity for panel
  

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

  // Word cloud data - use time range aggregation instead of single day
  const cloudData = useMemo(() => {
    if (timeRange === "day") {
      // For single day view, use the original aggregation
      return aggregateForDate(sessions, dateISO, activityNames);
    } else {
      // For time range view, aggregate across the selected range
      return aggregateByTimeRange(sessions, dateISO, timeRange, activityNames);
    }
  }, [sessions, dateISO, timeRange, activityNames]);

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
    setSelectedActivity(word);
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



  // Get weekly date range for display
  const weeklyRange = useMemo(() => {
    if (timeRange !== "week") return null;
    return formatWeeklyRange(dateISO);
  }, [timeRange, dateISO]);

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

        {/* Time range filter */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#667085", fontWeight: 600 }}>View:</span>
          <div style={{ display: "flex", gap: 2, border: "1px solid #D0D5DD", borderRadius: 8, overflow: "hidden" }}>
            {[
              { key: "day", label: "Day" },
              { key: "week", label: "Week" },
              { key: "month", label: "Month" },
              { key: "year", label: "Year" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  background: timeRange === key ? "#1D4ED8" : "#f9fafb",
                  color: timeRange === key ? "#fff" : "#374151",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title={`View ${label.toLowerCase()} data`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>


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

      {/* Cloud or Split View */}
      <div style={{ marginTop: 16 }}>
        {cloudData.length === 0 ? (
          <p style={{ color: "#667085" }}>
            No activities logged for {pretty(dateISO)} — add one above (or switch dates).
          </p>
        ) : (
          // Split Layout - Word Cloud + Activity Panel
          <div style={{ 
            display: 'flex', 
            gap: 0, 
            minHeight: 600,
            border: '1px solid #e5e7eb',
            borderRadius: 12
          }}>
            {/* Left Panel - Word Cloud (Narrow) */}
            <div style={{ 
              flex: '0 0 35%', 
              borderRight: '1px solid #e5e7eb',
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}>
              <WordCloud2 
                data={cloudData} 
                width={300} 
                height={560}
                selectedWord={selectedActivity}
                onWordClick={handleWordClick}
              />
            </div>
            
            {/* Right Panel - Activity Details (Wide) */}
            <div style={{ 
              flex: '1',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {selectedActivity ? (
                <ActivityTrendPanel
                  isOpen={true}
                  onClose={() => setSelectedActivity("")}
                  activity={selectedActivity}
                  timeRange={timeRange}
                  dateISO={dateISO}
                  sessions={sessions}
                  journalEntries={journalEntries}
                  activityNames={activityNames}
                  entries={timeRange === "day" ? 
                    journalEntries.filter(entry => 
                      normalizeActivityName(entry.word) === normalizeActivityName(selectedActivity) && 
                      entry.dateISO === dateISO
                    ) :
                    journalEntries.filter(entry => {
                      const matchesActivity = normalizeActivityName(entry.word) === normalizeActivityName(selectedActivity);
                      const matchesTimeRange = isDateInRange(entry.dateISO, dateISO, timeRange);
                      return matchesActivity && matchesTimeRange;
                    })
                  }
                  onSave={handleSaveJournalEntry}
                  onUpdate={handleUpdateJournalEntry}
                  onDelete={handleDeleteJournalEntry}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#6b7280',
                  fontSize: 16,
                  textAlign: 'center',
                  padding: 32
                }}>
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
                    <div>Click on a word to view activity details</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}