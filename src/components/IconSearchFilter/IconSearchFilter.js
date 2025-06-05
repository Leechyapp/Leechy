import React, { useRef, useEffect } from 'react';

const categories = [
  { key: 'womenswear', emoji: '👠', label: 'Womens' },
  { key: 'menswear', emoji: '👔', label: 'Mens' },
  { key: 'sports', emoji: '🏀', label: 'Sports' },
  { key: 'tools-machinery', emoji: '🛠️', label: 'Tools' },
  { key: 'furniture', emoji: '🪑', label: 'Furniture' },
  { key: 'outdoors', emoji: '🏕️', label: 'Outdoors' },
  { key: 'storage', emoji: '📦', label: 'Storage' },
  { key: 'toysgames', emoji: '🎮', label: 'Games' },
  { key: 'transportation', emoji: '🚲', label: 'Transport' },
  { key: 'workout', emoji: '🏋️‍♂️', label: 'Fitness' },
  { key: 'books', emoji: '📖', label: 'Books' },
  { key: 'electronics', emoji: '🎧', label: 'Electronics' },
  { key: 'party', emoji: '🎉', label: 'Party' }
];

export default function IconSearchFilter({ selected, onSelect }) {
  const containerRef = useRef(null);

  const handleSelect = (categoryKey) => {
    onSelect({ pub_categoryLevel1: categoryKey });
  };

  // Prevent pull-to-refresh from interfering with horizontal scrolling
  useEffect(() => {
    const containers = containerRef.current?.querySelectorAll('[data-scroll-container]');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    const handleTouchStart = (e) => {
      // Store initial touch position
      const touch = e.touches[0];
      e.currentTarget.startX = touch.clientX;
      e.currentTarget.startY = touch.clientY;
      e.currentTarget.scrollStartX = e.currentTarget.scrollLeft;
      e.currentTarget.hasIntercepted = false;
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - e.currentTarget.startX);
      const deltaY = Math.abs(touch.clientY - e.currentTarget.startY);
      const moveY = touch.clientY - e.currentTarget.startY;
      const moveX = touch.clientX - e.currentTarget.startX;
      
      // Only intercept if we haven't already decided to let the browser handle it
      if (e.currentTarget.hasIntercepted) {
        if (e.currentTarget.isHorizontalScrolling && isIOS) {
          e.preventDefault();
          // Continue manual scrolling for iOS with boundary handling
          const maxScrollLeft = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;
          const newScrollLeft = e.currentTarget.scrollStartX - moveX;
          const clampedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
          
          // Only update if we're not at the boundaries or if we're moving away from them
          if ((clampedScrollLeft > 0 && clampedScrollLeft < maxScrollLeft) || 
              (clampedScrollLeft === 0 && moveX < 0) || 
              (clampedScrollLeft === maxScrollLeft && moveX > 0)) {
            e.currentTarget.scrollLeft = clampedScrollLeft;
          }
        }
        return;
      }
      
      // Wait for more significant movement before making any decisions
      if (deltaX < 5 && deltaY < 5) {
        return; // Too small to determine intent
      }
      
      // Check if user is trying to scroll horizontally
      const isHorizontalScroll = deltaX > deltaY && deltaX > 3;
      
      // Check if this is a potential pull-to-refresh (downward movement at top of page)
      const isPullToRefresh = moveY > 8 && deltaY > deltaX && window.pageYOffset === 0;
      
      if (isHorizontalScroll) {
        // User is clearly trying to scroll horizontally - intercept this
        e.currentTarget.hasIntercepted = true;
        e.currentTarget.isHorizontalScrolling = true;
        e.stopPropagation();
        
        if (isIOS) {
          e.preventDefault();
          
          // Manual scrolling for iOS to ensure smooth horizontal scroll
          const newScrollLeft = e.currentTarget.scrollStartX - moveX;
          e.currentTarget.scrollLeft = Math.max(0, Math.min(newScrollLeft, e.currentTarget.scrollWidth - e.currentTarget.clientWidth));
        }
      } else if (isPullToRefresh) {
        // This is clearly a pull-to-refresh attempt - intercept and prevent it
        e.currentTarget.hasIntercepted = true;
        e.preventDefault();
        e.stopPropagation();
      }
      // For any other movement (including upward vertical scrolling), let the browser handle it naturally
      // Don't set hasIntercepted to true, so the browser can handle subsequent touch events
    };

    const handleTouchEnd = (e) => {
      // Clean up
      delete e.currentTarget.startX;
      delete e.currentTarget.startY;
      delete e.currentTarget.scrollStartX;
      delete e.currentTarget.hasIntercepted;
      delete e.currentTarget.isHorizontalScrolling;
    };

    if (containers) {
      containers.forEach(container => {
        // Use passive: true for touchmove to allow browser optimizations when we're not intercepting
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
      });
    }

    return () => {
      if (containers) {
        containers.forEach(container => {
          container.removeEventListener('touchstart', handleTouchStart);
          container.removeEventListener('touchmove', handleTouchMove);
          container.removeEventListener('touchend', handleTouchEnd);
        });
      }
    };
  }, []);

  // Split categories into two rows
  const firstRow = categories.slice(0, Math.ceil(categories.length / 2));
  const secondRow = categories.slice(Math.ceil(categories.length / 2));

  const renderScrollableRow = (rowCategories) => (
    <div 
      style={styles.scrollContainer}
      data-scroll-container
    >
      {rowCategories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => handleSelect(cat.key)}
          style={{
            ...styles.item,
            ...(selected === cat.key ? styles.selectedItem : {})
          }}
        >
          <div style={styles.emoji}>{cat.emoji}</div>
          <div style={styles.label}>{cat.label}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div style={styles.container} ref={containerRef}>
      {renderScrollableRow(firstRow)}
      {renderScrollableRow(secondRow)}
    </div>
  );
}

const styles = {
  container: {
    margin: '0',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    zIndex: 10,
    // Remove conflicting touch-action, let iOS handle naturally
  },
  scrollContainer: {
    display: 'flex',
    overflowX: 'auto',
    padding: '5px 10px',
    gap: '10px',
    marginBottom: '0',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-x pan-y pinch-zoom', // Allow both horizontal and vertical panning
    position: 'relative',
    '-webkit-scrollbar': 'none',
    '-ms-overflow-style': 'none',
    // iOS-specific fixes to prevent bounce and improve consistency
    '-webkit-touch-callout': 'none',
    '-webkit-user-select': 'none',
    '-webkit-overflow-scrolling': 'touch',
    // Prevent overscroll bounce on iOS
    overscrollBehavior: 'contain',
    overscrollBehaviorX: 'contain',
    '&::-webkit-scrollbar': {
      display: 'none',
      width: 0,
      height: 0,
      background: 'transparent',
      appearance: 'none',
      '-webkit-appearance': 'none',
    },
    '&::-webkit-scrollbar-track': {
      display: 'none',
      width: 0,
      height: 0,
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      display: 'none',
      width: 0,
      height: 0,
      background: 'transparent',
    },
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
    height: '80px',
    textAlign: 'center',
    padding: '10px',
    borderRadius: '12px',
    transition: 'background-color 0.3s',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    touchAction: 'manipulation', // Prevent double-tap zoom and other touch behaviors
  },
  selectedItem: {
    backgroundColor: '#e0f7f3',
  },
  emoji: {
    fontSize: '32px',
    lineHeight: '1',
  },
  label: {
    marginTop: '5px',
    fontSize: '12px',
    lineHeight: '1',
  },
};