import React, { useEffect, useState } from 'react';
import TrendGraph from './TrendGraph';

/**
 * ActivityTrendPanel Component
 * Full-height right-side panel for activity trends and journal entries
 * 
 * Props:
 *   isOpen: boolean - whether panel is open
 *   onClose: function - callback to close panel
 *   activity: string - activity name
 *   timeRange: string - "day", "week", "month", "year"
 *   dateISO: string - reference date
 *   sessions: array - all sessions data
 *   journalEntries: array - all journal entries
 *   activityNames: object - normalized name mappings
 *   entries: array - journal entries for this activity
 *   onSave: function - save journal entry
 *   onUpdate: function - update journal entry
 *   onDelete: function - delete journal entry
 */
const ActivityTrendPanel = ({ 
  isOpen, 
  onClose, 
  activity,
  timeRange,
  dateISO,
  sessions,
  journalEntries,
  activityNames,
  entries = [],
  onSave,
  onUpdate,
  onDelete
}) => {
  const [panelTab, setPanelTab] = useState('journal'); // 'trend' or 'journal'
  const [newEntryText, setNewEntryText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle outside click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Helper function to normalize activity names
  const normalizeActivityName = (name) => {
    return name.trim().toLowerCase();
  };

  // Get activity emoji
  const getActivityEmoji = (activityName) => {
    const emojiMap = {
      'reading': '📖',
      'writing': '✍️',
      'gaming': '🎮',
      'workout': '💪',
      'running': '🏃',
      'walking': '🚶',
      'cycling': '🚴',
      'swimming': '🏊',
      'yoga': '🧘',
      'meditation': '🧘',
      'cooking': '👨‍🍳',
      'cleaning': '🧹',
      'gardening': '🌱',
      'piano': '🎹',
      'guitar': '🎸',
      'music': '🎵',
      'art': '🎨',
      'photography': '📸',
      'social': '👥',
      'work': '💼',
      'study': '📚',
      'project': '🔧',
      'anime': '📺',
      'tv': '📺',
      'movie': '🎬',
      'tea': '🍵',
      'coffee': '☕',
      'sleep': '😴',
      'relax': '😌'
    };
    
    const normalized = normalizeActivityName(activityName);
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (normalized.includes(key)) {
        return emoji;
      }
    }
    return '📝';
  };

  // Get time range display text
  const getTimeRangeText = () => {
    const date = new Date(dateISO + 'T00:00:00');
    switch (timeRange) {
      case 'day':
        return date.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      case 'week':
        // Calculate week range
        const getTimeRangeStart = (referenceDate, range) => {
          const ref = new Date(referenceDate + "T00:00:00");
          const dayOfWeek = ref.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          ref.setDate(ref.getDate() + mondayOffset);
          return ref.toISOString().split('T')[0];
        };
        
        const getTimeRangeEnd = (referenceDate, range) => {
          const ref = new Date(referenceDate + "T00:00:00");
          const dayOfWeek = ref.getDay();
          const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          ref.setDate(ref.getDate() + sundayOffset);
          return ref.toISOString().split('T')[0];
        };
        
        const startDate = getTimeRangeStart(dateISO, "week");
        const endDate = getTimeRangeEnd(dateISO, "week");
        
        const start = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");
        
        if (startDate === endDate) {
          return start.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          });
        }
        
        const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
        const startDay = start.getDate();
        const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
        const endDay = end.getDate();
        
        if (startMonth === endMonth) {
          return `${startMonth} ${startDay}–${endDay}`;
        } else {
          return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
        }
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return 'This Period';
    }
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        height: '100%'
      }}
    >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 24 }}>{getActivityEmoji(activity)}</span>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#111827'
                }}>
                  {activity}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280'
                }}>
                  {getTimeRangeText()}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#6b7280',
                cursor: 'pointer',
                borderRadius: 6,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#6b7280';
              }}
            >
              ×
            </button>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: 4,
            border: '1px solid #D0D5DD',
            borderRadius: 8,
            overflow: 'hidden',
            width: 'fit-content'
          }}>
            <button
              onClick={() => setPanelTab('journal')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: panelTab === 'journal' ? '#1D4ED8' : '#f9fafb',
                color: panelTab === 'journal' ? '#fff' : '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📝</span>
              <span>Journal Entries</span>
            </button>
            <button
              onClick={() => setPanelTab('trend')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: panelTab === 'trend' ? '#1D4ED8' : '#f9fafb',
                color: panelTab === 'trend' ? '#fff' : '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📊</span>
              <span>Trend Graph</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {panelTab === 'trend' ? (
            /* Trend Graph Tab */
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px'
            }}>
              <TrendGraph
                activity={activity}
                timeRange={timeRange}
                dateISO={dateISO}
                sessions={sessions}
                journalEntries={journalEntries}
                activityNames={activityNames}
              />
            </div>
          ) : (
            /* Journal Entries Tab */
            <div style={{
              height: '400px',
              overflowY: 'auto',
              padding: '16px 24px',
              border: '1px solid #e5e7eb'
            }}>
                {entries.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                    <div>No journal entries yet</div>
                    <div style={{ fontSize: 14, marginTop: 8 }}>
                      Add your first entry below
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Group entries by date for time ranges */}
                    {timeRange !== 'day' ? (
                      // Group by date for weekly/monthly/yearly views
                      (() => {
                        const groupedEntries = {};
                        entries.forEach(entry => {
                          const date = entry.dateISO;
                          if (!groupedEntries[date]) {
                            groupedEntries[date] = [];
                          }
                          groupedEntries[date].push(entry);
                        });
                        
                        // Sort dates and entries within each date
                        Object.keys(groupedEntries).forEach(date => {
                          groupedEntries[date].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        });
                        
                        return Object.keys(groupedEntries)
                          .sort((a, b) => new Date(b) - new Date(a)) // Most recent first
                          .map(date => (
                            <div key={date}>
                              {/* Date header */}
                              <div style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#374151',
                                marginBottom: 8,
                                paddingBottom: 8,
                                borderBottom: '1px solid #e5e7eb'
                              }}>
                                {formatDate(date)}
                              </div>
                              
                              {/* Entries for this date */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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
                          ));
                      })()
                    ) : (
                      // Single day view - no date grouping
                      entries
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
                        ))
                    )}
                  </div>
                )}
              
              {/* New Entry Form */}
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                flexShrink: 0,
                marginTop: 'auto'
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
          )}
        </div>
      </div>
  );
};

export default ActivityTrendPanel;
