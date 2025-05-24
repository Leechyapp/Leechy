import React from 'react';

const categories = [
  { key: 'womenswear', emoji: '👠', label: 'Womens' },
  { key: 'menswear', emoji: '👔', label: 'Mens' },
  { key: 'sports', emoji: '🏀', label: 'Sports' },
  { key: 'toolsmachinery', emoji: '🛠️', label: 'Tools' },
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
  const handleSelect = (categoryKey) => {
    onSelect({ pub_categoryLevel1: categoryKey });
  };

  // Split categories into two rows
  const firstRow = categories.slice(0, Math.ceil(categories.length / 2));
  const secondRow = categories.slice(Math.ceil(categories.length / 2));

  const renderScrollableRow = (rowCategories) => (
    <div style={styles.scrollContainer}>
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
    <div style={styles.container}>
      {renderScrollableRow(firstRow)}
      {renderScrollableRow(secondRow)}
    </div>
  );
}

const styles = {
  container: {
    margin: '5px 0',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    zIndex: 1,
  },
  scrollContainer: {
    display: 'flex',
    overflowX: 'auto',
    padding: '5px 10px',
    gap: '10px',
    marginBottom: '5px',
    scrollbarWidth: 'thin',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '3px',
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
