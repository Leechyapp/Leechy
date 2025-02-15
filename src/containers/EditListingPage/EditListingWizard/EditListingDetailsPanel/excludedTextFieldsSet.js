const excludedTextFieldsSet = new Set();

const listingCategories = [
  'books',
  'electronics',
  'furniture',
  'menswear',
  'outdoors',
  'party',
  'self_storage',
  'sports',
  'toysgames',
  'toolsmachinery',
  'transportation',
  'womenswear',
  'workout',
];

listingCategories.forEach(f => excludedTextFieldsSet.add(f));

export default excludedTextFieldsSet;
