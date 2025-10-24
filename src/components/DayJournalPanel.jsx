import React, { useState, useMemo } from 'react';

/**
 * DayJournalPanel Component
 * Shows journal entries for a selected activity on a single day
 * Includes a trend graph showing hourly activity patterns
 */
export default function DayJournalPanel({
  activity,
  dateISO,
  entries = [],
  sessions = [],
  journalEntries = [],
  activityNames = {},
  onSave,
  onUpdate,
  onDelete,
}) {
  const [newEntryText, setNewEntryText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Helper function to normalize activity names
  const normalizeActivityName = (name) => {
    return name.trim().toLowerCase();
  };

  // Calculate hourly time data for the activity on this day
  const hourlyData = useMemo(() => {
    const normalizedActivity = normalizeActivityName(activity);
    const daySessions = sessions.filter(session => 
      session.dateISO === dateISO && 
      normalizeActivityName(session.activity) === normalizedActivity
    );

    // Group sessions by hour (0-23)
    const hourlyMap = new Map();
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, 0);
    }

    // Add session times to appropriate hours
    daySessions.forEach(session => {
      // For simplicity, assume sessions are logged with current time
      // In a real app, you might want to store actual session start times
      const now = new Date();
      const hour = now.getHours();
      hourlyMap.set(hour, hourlyMap.get(hour) + session.minutes);
    });

    return Array.from(hourlyMap.entries()).map(([hour, minutes]) => ({
      hour,
      minutes,
      label: `${hour}:00`
    }));
  }, [activity, dateISO, sessions]);

  // Calculate totals
  const totalMinutes = hourlyData.reduce((sum, hour) => sum + hour.minutes, 0);
  const sessionCount = sessions.filter(session => 
    session.dateISO === dateISO && 
    normalizeActivityName(session.activity) === normalizeActivityName(activity)
  ).length;

  // Get activity emoji
  const getActivityEmoji = (activityName) => {
    const emojiMap = {
      'reading': '📖',
      'running': '🏃',
      'writing': '✍️',
      'coding': '💻',
      'cooking': '👨‍🍳',
      'gaming': '🎮',
      'exercise': '💪',
      'work': '💼',
      'study': '📚',
      'sleep': '😴',
      'meditation': '🧘',
      'music': '🎵',
      'art': '🎨',
      'travel': '✈️',
      'social': '👥',
    };
    
    const normalized = activityName.toLowerCase();
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (normalized.includes(key)) {
        return emoji;
      }
    }
    return '📝';
  };

  // Format time for display
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  // Format date for display
  const formatDate = (dateISO) => {
    const date = new Date(dateISO + "T00:00:00");
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle saving new entry
  const handleSave = (e) => {
    e.preventDefault();
    if (!newEntryText.trim()) return;
    
    const newEntry = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      word: activity,
      text: newEntryText.trim(),
      dateISO: dateISO,
      timestamp: new Date().toISOString(),
    };
    
    onSave(newEntry);
    setNewEntryText('');
  };

  // Handle starting edit
  const startEditing = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  // Handle canceling edit
  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  // Handle saving edit
  const saveEdit = () => {
    if (editText.trim() && editingId) {
      onUpdate(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  // Handle edit key down
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Handle delete entry
  const handleDelete = (entryId) => {
    if (confirm('Delete this journal entry?')) {
      onDelete(entryId);
    }
  };

  // Get max value for scaling
  const maxMinutes = Math.max(...hourlyData.map(h => h.minutes), 1);

  return (
    <div 
      data-journal-panel
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff'
      }}
    >
      {/* Trend Graph for Day */}
      <div style={{ 
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        {/* Header with activity info */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            margin: '0 0 4px 0',
            color: '#111827'
          }}>
            {getActivityEmoji(activity)} {activity} — {formatDate(dateISO)}
          </h3>
          <div style={{ 
            fontSize: 14, 
            color: '#6b7280',
            display: 'flex',
            gap: 16
          }}>
            <span>Total: {formatTime(totalMinutes)}</span>
            <span>•</span>
            <span>{sessionCount} sessions</span>
            <span>•</span>
            <span>{entries.length} entries</span>
          </div>
        </div>

        {/* Hourly trend chart */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'end', 
          gap: 2, 
          height: 80,
          padding: '12px 0'
        }}>
          {hourlyData.map((hourData, index) => {
            const height = (hourData.minutes / maxMinutes) * 60; // Max height 60px
            const hasData = hourData.minutes > 0;
            
            return (
              <div
                key={hourData.hour}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                {/* Bar */}
                <div
                  style={{
                    width: '100%',
                    height: Math.max(height, 2), // Minimum 2px height
                    backgroundColor: hasData ? '#3b82f6' : '#e5e7eb',
                    borderRadius: 1,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  title={`${hourData.label}: ${formatTime(hourData.minutes)}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hasData ? '#1d4ed8' : '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = hasData ? '#3b82f6' : '#e5e7eb';
                  }}
                >
                  {/* Time label on top of bar */}
                  {hasData && height > 15 && (
                    <div style={{
                      position: 'absolute',
                      top: -15,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 9,
                      fontWeight: 600,
                      color: '#374151',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatTime(hourData.minutes)}
                    </div>
                  )}
                </div>
                
                {/* Hour label */}
                <div style={{
                  fontSize: 9,
                  color: '#6b7280',
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  {hourData.hour}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb',
          fontSize: 12,
          color: '#6b7280'
        }}>
          <span>Most active hour: {hourlyData.reduce((max, hour) => hour.minutes > max.minutes ? hour : max, {minutes: 0, hour: 0}).hour}:00</span>
          <span>Peak: {formatTime(Math.max(...hourlyData.map(h => h.minutes)))}</span>
        </div>
      </div>

      {/* Entries List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px'
      }}>
        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div>No journal entries yet</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              Add your first entry below
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Most recent first
              .map(entry => (
                <div key={entry.id} style={{
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  position: 'relative'
                }}>
                  {editingId === entry.id ? (
                    // Edit mode
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        style={{
                          width: '100%',
                          minHeight: 60,
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          fontSize: 14,
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                        autoFocus
                      />
                      <div style={{
                        display: 'flex',
                        gap: 8,
                        marginTop: 8
                      }}>
                        <button
                          onClick={saveEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6b7280',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div
                        onClick={() => startEditing(entry)}
                        style={{
                          cursor: 'pointer',
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: '#374151',
                          marginBottom: 8
                        }}
                      >
                        {entry.text}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: '#6b7280'
                      }}>
                        <span>
                          {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* New Entry Form */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              placeholder="Add a journal entry..."
              style={{
                flex: 1,
                minHeight: 40,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <button
              type="submit"
              disabled={!newEntryText.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: newEntryText.trim() ? '#1d4ed8' : '#9ca3af',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: newEntryText.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
