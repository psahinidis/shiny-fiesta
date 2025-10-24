import React from 'react';

/**
 * TrendGraph Component
 * Shows daily time trends for a selected activity across a time range
 * 
 * Props:
 *   activity: string - activity name
 *   timeRange: string - "week", "month", "year"
 *   dateISO: string - reference date
 *   sessions: array - all sessions data
 *   journalEntries: array - all journal entries
 *   activityNames: object - normalized name mappings
 */
export default function TrendGraph({
  activity,
  timeRange,
  dateISO,
  sessions = [],
  journalEntries = [],
  activityNames = {}
}) {
  // Helper function to normalize activity names
  const normalizeActivityName = (name) => {
    return name.trim().toLowerCase();
  };

  // Get the start and end dates for the time range
  const getTimeRangeStart = (referenceDate, range) => {
    const ref = new Date(referenceDate + "T00:00:00");
    
    switch (range) {
      case "week":
        const dayOfWeek = ref.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        ref.setDate(ref.getDate() + mondayOffset);
        break;
      case "month":
        ref.setDate(1);
        break;
      case "year":
        ref.setMonth(0, 1);
        break;
      default:
        return referenceDate;
    }
    
    return ref.toISOString().split('T')[0];
  };

  const getTimeRangeEnd = (referenceDate, range) => {
    const ref = new Date(referenceDate + "T00:00:00");
    
    switch (range) {
      case "week":
        const dayOfWeek = ref.getDay();
        const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        ref.setDate(ref.getDate() + sundayOffset);
        break;
      case "month":
        ref.setMonth(ref.getMonth() + 1, 0);
        break;
      case "year":
        ref.setMonth(11, 31);
        break;
      default:
        return referenceDate;
    }
    
    return ref.toISOString().split('T')[0];
  };

  // Generate array of dates in the range
  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Calculate time data for the activity (daily for week/month, monthly for year)
  const timeData = React.useMemo(() => {
    if (!activity || !sessions || !Array.isArray(sessions)) {
      return [];
    }
    
    const normalizedActivity = normalizeActivityName(activity);
    
    if (timeRange === 'year') {
      // For yearly view, aggregate by months
      const monthlyData = [];
      const year = new Date(dateISO + "T00:00:00").getFullYear();
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        const monthSessions = sessions.filter(session => {
          if (!session.dateISO || !session.activity) return false;
          try {
            const sessionDate = new Date(session.dateISO + "T00:00:00");
            const sessionDateStr = sessionDate.toISOString().split('T')[0];
            const monthStartStr = monthStart.toISOString().split('T')[0];
            const monthEndStr = monthEnd.toISOString().split('T')[0];
            return sessionDateStr >= monthStartStr && 
                   sessionDateStr <= monthEndStr && 
                   normalizeActivityName(session.activity) === normalizedActivity;
          } catch (error) {
            console.warn('Error parsing session date:', session.dateISO, error);
            return false;
          }
        });
        
        const totalMinutes = monthSessions.reduce((sum, session) => sum + session.minutes, 0);
        
        monthlyData.push({
          date: monthStart.toISOString().split('T')[0],
          minutes: totalMinutes,
          sessionCount: monthSessions.length,
          monthName: monthStart.toLocaleDateString(undefined, { month: 'short' })
        });
      }
      
      return monthlyData;
    } else {
      // For week/month view, use daily data
      const startDate = getTimeRangeStart(dateISO, timeRange);
      const endDate = getTimeRangeEnd(dateISO, timeRange);
      const dateRange = generateDateRange(startDate, endDate);
      
      return dateRange.map(date => {
        const daySessions = sessions.filter(session => 
          session.dateISO === date && 
          session.activity &&
          normalizeActivityName(session.activity) === normalizedActivity
        );
        
        const totalMinutes = daySessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
        
        return {
          date,
          minutes: totalMinutes,
          sessionCount: daySessions.length
        };
      });
    }
  }, [activity, timeRange, dateISO, sessions]);

  // Calculate totals
  const totalMinutes = timeData.reduce((sum, day) => sum + (day.minutes || 0), 0);
  const totalSessions = timeData.reduce((sum, day) => sum + (day.sessionCount || 0), 0);
  const entryCount = journalEntries.filter(entry => 
    normalizeActivityName(entry.word) === normalizeActivityName(activity)
  ).length;

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
  const formatDate = (dateISO, isYearly = false) => {
    const date = new Date(dateISO + "T00:00:00");
    if (isYearly) {
      return date.toLocaleDateString(undefined, { month: 'short' });
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get max value for scaling
  const maxMinutes = Math.max(...timeData.map(d => d.minutes || 0), 1);

  return (
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
          📊 {activity} — {timeRange === 'week' ? 'This Week' : 
                        timeRange === 'month' ? 'This Month' : 'This Year'}
        </h3>
        <div style={{ 
          fontSize: 14, 
          color: '#6b7280',
          display: 'flex',
          gap: 16
        }}>
          <span>Total: {formatTime(totalMinutes)}</span>
          <span>•</span>
          <span>{totalSessions} sessions</span>
          <span>•</span>
          <span>{entryCount} entries</span>
        </div>
      </div>

      {/* Mini trend chart */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        gap: 4, 
        height: 120,
        padding: '12px 0'
      }}>
        {timeData.map((period, index) => {
          const height = (period.minutes / maxMinutes) * 80; // Max height 80px
          const hasData = period.minutes > 0;
          const isYearly = timeRange === 'year';
          
          return (
            <div
              key={period.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: Math.max(height, 2), // Minimum 2px height
                  backgroundColor: hasData ? '#3b82f6' : '#e5e7eb',
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={`${formatDate(period.date, isYearly)}: ${formatTime(period.minutes)}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hasData ? '#1d4ed8' : '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = hasData ? '#3b82f6' : '#e5e7eb';
                }}
              >
                {/* Time label on top of bar */}
                {hasData && height > 20 && (
                  <div style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#374151',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatTime(period.minutes)}
                  </div>
                )}
              </div>
              
              {/* Date/Month label */}
              <div style={{
                fontSize: 10,
                color: '#6b7280',
                fontWeight: 500,
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {formatDate(period.date, isYearly)}
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
        <span>Daily average: {formatTime(Math.round(totalMinutes / timeData.length))}</span>
        <span>Most active: {formatTime(Math.max(...timeData.map(d => d.minutes || 0)))}</span>
      </div>
    </div>
  );
}
