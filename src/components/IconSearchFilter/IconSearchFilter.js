import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const categories = [
  { key: 'womens', emoji: '👠', label: 'Womens' },
  { key: 'mens', emoji: '👔', label: 'Mens' },
  { key: 'sports', emoji: '🏀', label: 'Sports' },
  { key: 'tools', emoji: '🛠️', label: 'Tools' },
  { key: 'furniture', emoji: '🪑', label: 'Furniture' },
  { key: 'games', emoji: '🎮', label: 'Games' },
  { key: 'transport', emoji: '🚲', label: 'Transport' },
  { key: 'fitness', emoji: '🏋️‍♂️', label: 'Fitness' },
  { key: 'books', emoji: '📖', label: 'Books' },
  { key: 'electronics', emoji: '🎧', label: 'Electronics' },
  { key: 'party', emoji: '🎉', label: 'Party' },
  { key: 'outdoors', emoji: '🏕️', label: 'Outdoors' },
  { key: 'storage', emoji: '📦', label: 'Storage' }
];

export default function IconSearchFilter({ selected, onSelect }) {
  const topRow = categories.slice(0, 6);
  const bottomRow = categories.slice(6);

  const renderRow = (row) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
      {row.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={[
            styles.item,
            selected === cat.key && styles.selectedItem
          ]}
          onPress={() => onSelect(cat.key)}
        >
          <Text style={styles.emoji}>{cat.emoji}</Text>
          <Text style={styles.label}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderRow(topRow)}
      {renderRow(bottomRow)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  item: {
    alignItems: 'center',
    marginRight: 16,
  },
  selectedItem: {
    backgroundColor: '#e0f7f3',
    borderRadius: 12,
    padding: 10,
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    marginTop: 5,
    fontSize: 12,
  },
});