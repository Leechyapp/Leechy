import React from 'react';

const categories = [
  { key: 'womenswear', emoji: '👠', label: 'Womens' },
  { key: 'menswear', emoji: '👔', label: 'Mens' },
  { key: 'sports', emoji: '🏀', label: 'Sports' },
  { key: 'toolsmachinery', emoji: '🛠️', label: 'Tools' },
  { key: 'furniture', emoji: '🪑', label: 'Furniture' },
  { key: 'toysgames', emoji: '🎮', label: 'Games' },
  { key: 'transportation', emoji: '🚲', label: 'Transport' },
  { key: 'workout', emoji: '🏋️‍♂️', label: 'Fitness' },
  { key: 'books', emoji: '📖', label: 'Books' },
  { key: 'electronics', emoji: '🎧', label: 'Electronics' },
];

export default function IconSearchFilter({ selected, onSelect }) {
  const topRow = categories.slice(0, 5);
  const bottomRow = categories.slice(5);

  const handleSelect = (categoryKey) => {
    // Use the categoryLevel1 parameter which is the standard for category filtering
    onSelect({ pub_categoryLevel1: categoryKey });
  };

  const renderRow = (row) => (
    <div style={styles.scrollRow}>
      {row.map((cat) => (
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
      {renderRow(topRow)}
      {renderRow(bottomRow)}
    </div>
  );
}

const styles = {
  container: {
    margin: '10px 0',
  },
  scrollRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    padding: '0 10px',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    textAlign: 'center',
    padding: '10px',
    borderRadius: '12px',
    transition: 'background-color 0.3s',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
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
