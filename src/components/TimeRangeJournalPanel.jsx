import React, { useState, useMemo } from 'react';
import TrendGraph from './TrendGraph';

/**
 * TimeRangeJournalPanel Component
 * Shows journal entries for a selected activity across a time range
 * Groups entries by date and shows them in a scrollable list
 */
export default function TimeRangeJournalPanel({
  activity,
  timeRange,
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

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups = {};
    entries.forEach(entry => {
      const date = entry.dateISO;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    
    // Sort dates and entries within each date
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
    
    return groups;
  }, [entries]);

  // Get time range display text
  const getTimeRangeText = () => {
    const date = new Date(dateISO + 'T00:00:00');
    switch (timeRange) {
      case 'week':
        return 'This Week';
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return 'This Period';
    }
  };

  // Get activity emoji (simple mapping)
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
    return '📝'; // default emoji
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

  // Format date for display
  const formatDate = (dateISO) => {
    const date = new Date(dateISO + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

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
      {/* Trend Graph */}
      <TrendGraph
        activity={activity}
        timeRange={timeRange}
        dateISO={dateISO}
        sessions={sessions}
        journalEntries={journalEntries}
        activityNames={activityNames}
      />

      {/* Entries List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px'
      }}>
        {Object.keys(groupedEntries).length === 0 ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.keys(groupedEntries)
              .sort((a, b) => new Date(b) - new Date(a)) // Most recent first
              .map(date => (
                <div key={date}>
                  {/* Date header */}
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {formatDate(date)}
                  </div>
                  
                  {/* Entries for this date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groupedEntries[date].map(entry => (
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
