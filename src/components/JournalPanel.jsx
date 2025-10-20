import React, { useState, useEffect } from 'react';

/**
 * JournalPanel - A sliding panel from the right for journal entries
 * 
 * @param {boolean} isOpen - Whether the panel is visible
 * @param {function} onClose - Callback to close the panel
 * @param {string} selectedWord - The word that was clicked
 * @param {string} dateISO - Current date in ISO format
 * @param {number} totalMinutes - Total minutes invested in this activity
 * @param {array} entries - Array of journal entries for this word/date
 * @param {function} onSave - Callback when saving a new entry
 * @param {function} onUpdate - Callback when updating an entry
 * @param {function} onDelete - Callback when deleting an entry
 */
export default function JournalPanel({ 
  isOpen, 
  onClose, 
  selectedWord, 
  dateISO,
  totalMinutes = 0,
  entries = [],
  onSave,
  onUpdate,
  onDelete,
}) {
  const [journalText, setJournalText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleSave = () => {
    if (!journalText.trim()) return;
    
    const newEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      text: journalText.trim(),
      timestamp: new Date().toISOString(),
      dateISO,
      word: selectedWord,
    };
    
    onSave(newEntry);
    setJournalText('');
  };

  const handleKeyDown = (e) => {
    // Save on Cmd+Enter or Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const startEditing = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = (entryId) => {
    if (!editText.trim()) return;
    
    onUpdate(entryId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e, entryId) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit(entryId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleDelete = (entryId) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      onDelete(entryId);
    }
  };

  // Format minutes into a readable string
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease, visibility 0.3s ease',
          zIndex: 998,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '450px',
          maxWidth: '90vw',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>
              {selectedWord}
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, marginBottom: 4 }}>
              Journal for {new Date(dateISO + 'T00:00:00').toLocaleDateString()}
            </p>
            <div style={{ 
              display: 'inline-block',
              padding: '4px 10px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⏱️ {formatTime(totalMinutes)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0 8px',
              lineHeight: 1,
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Journal entries */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {entries.length === 0 ? (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
              No journal entries yet. Start writing below!
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: editingId === entry.id ? '#fffbeb' : '#f9fafb',
                  borderRadius: 8,
                  border: editingId === entry.id ? '1px solid #fbbf24' : '1px solid #e5e7eb',
                  transition: 'all 0.2s ease',
                }}
              >
                {editingId === entry.id ? (
                  // Edit mode
                  <>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, entry.id)}
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'space-between' }}>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{
                          padding: '4px 12px',
                          background: 'transparent',
                          border: '1px solid #ef4444',
                          borderRadius: 4,
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        title="Delete entry"
                      >
                        Delete
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '4px 12px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(entry.id)}
                          disabled={!editText.trim()}
                          style={{
                            padding: '4px 12px',
                            background: editText.trim() ? '#1D4ED8' : '#d1d5db',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: editText.trim() ? 'pointer' : 'not-allowed',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // View mode
                  <>
                    <div
                      onClick={() => startEditing(entry)}
                      style={{
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                      title="Click to edit"
                    >
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {entry.text}
                      </p>
                    </div>
                    <p
                      style={{
                        margin: '8px 0 0 0',
                        fontSize: 11,
                        color: '#9ca3af',
                      }}
                    >
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* New entry form */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
          }}
        >
          <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#374151' }}>
            Add New Entry
          </label>
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your thoughts..."
            style={{
              width: '100%',
              minHeight: 100,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Tip: Press ⌘+Enter to save
            </span>
            <button
              onClick={handleSave}
              disabled={!journalText.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: journalText.trim() ? '#1D4ED8' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: journalText.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

