const listingCategoriesSet = new Set();

const listingCategoriesArr = [
  'books',
  'electronics',
  'furniture',
  'menswear',
  'outdoors',
  'party',
  'self_storage',
  'sports',
  'toysgames',
  'transportation',
  'womenswear',
  'workout',
];
listingCategoriesArr.forEach(f => listingCategoriesSet.add(f));

export default listingCategoriesSet;
