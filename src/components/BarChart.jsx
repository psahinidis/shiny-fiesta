import React from 'react';

/**
 * BarChart Component
 * Renders a horizontal bar chart for activity time data
 * 
 * Props:
 *   data: [{ text: string, value: number }] - activity data with total minutes
 *   selectedActivity: string - currently selected activity
 *   onBarClick: function(activityName) - callback when bar is clicked
 *   maxValue: number - maximum value for scaling (optional)
 */
export default function BarChart({ 
  data = [], 
  selectedActivity = null, 
  onBarClick,
  maxValue = null 
}) {
  // Calculate max value if not provided
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  // Generate consistent colors for activities
  const getActivityColor = (activityName) => {
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < activityName.length; i++) {
      hash = ((hash << 5) - hash + activityName.charCodeAt(i)) & 0xffffffff;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
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

  return (
    <div style={{ width: '100%', height: '100%', padding: '16px' }}>
      <h3 style={{ 
        fontSize: 18, 
        fontWeight: 700, 
        margin: '0 0 16px 0', 
        color: '#374151' 
      }}>
        Activity Time Distribution
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8,
        height: 'calc(100% - 50px)',
        overflowY: 'auto'
      }}>
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          const isSelected = selectedActivity === item.text;
          const color = getActivityColor(item.text);
          
          return (
            <div
              key={item.text}
              onClick={() => onBarClick && onBarClick(item.text)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                border: isSelected ? `2px solid ${color}` : '2px solid transparent',
                position: 'relative',
                '&:hover': {
                  backgroundColor: '#f9fafb',
                  transform: 'translateX(2px)'
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isSelected ? '#f3f4f6' : 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              {/* Activity name */}
              <div style={{
                minWidth: '120px',
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                marginRight: 12
              }}>
                {item.text}
              </div>
              
              {/* Bar container */}
              <div style={{
                flex: 1,
                height: 24,
                backgroundColor: '#e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                marginRight: 12
              }}>
                {/* Bar fill */}
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: 12,
                  transition: 'width 0.3s ease',
                  position: 'relative'
                }}>
                  {/* Time label inside bar (if there's space) */}
                  {percentage > 30 && (
                    <div style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>
                      {formatTime(item.value)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Time value */}
              <div style={{
                minWidth: '60px',
                fontSize: 12,
                fontWeight: 600,
                color: '#6b7280',
                textAlign: 'right'
              }}>
                {formatTime(item.value)}
              </div>
              
              {/* Hover tooltip */}
              <div style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1f2937',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
                zIndex: 10
              }}
              className="bar-tooltip"
              >
                {item.text}: {formatTime(item.value)}
              </div>
            </div>
          );
        })}
      </div>
      
      <style jsx>{`
        .bar-tooltip {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        div:hover .bar-tooltip {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
