import React, { useEffect } from 'react';
import TrendGraph from './TrendGraph';

/**
 * TrendSlidePanel Component
 * Right-side slide-out panel for trend graph
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
 */
const TrendSlidePanel = ({ 
  isOpen, 
  onClose, 
  activity, 
  timeRange, 
  dateISO, 
  sessions, 
  journalEntries, 
  activityNames 
}) => {
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={handleBackdropClick}
      />
      
      {/* Slide Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '700px',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: '#111827'
              }}>
                {activity} Trend
              </h3>
              <p style={{
                margin: 0,
                fontSize: 14,
                color: '#6b7280'
              }}>
                {timeRange === 'day' ? 'Today' : 
                 timeRange === 'week' ? 'This Week' :
                 timeRange === 'month' ? 'This Month' : 'This Year'}
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

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflow: 'auto'
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
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { 
            transform: translateX(100%); 
            opacity: 0;
          }
          to { 
            transform: translateX(0); 
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default TrendSlidePanel;
