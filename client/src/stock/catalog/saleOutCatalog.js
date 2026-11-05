// Master catalog — prices only changeable here (not editable in the entry form).
export const SALEOUT_CATALOG = [
  {
    category: 'Signature Donuts',
    colorClass: 'bg-pink-50',
    headerClass: 'bg-pink-200 text-pink-900',
    items: [
      { name: 'Chocoholic', price: 299 },
      { name: 'Boston Cream', price: 299 },
      { name: 'Nutella', price: 299 },
      { name: 'Coffee', price: 299 },
      { name: 'Lotus', price: 299 },
      { name: 'Brownie Filled', price: 299 },
      { name: 'Butter Cream', price: 299 },
      { name: 'Mix Berry', price: 299 },
      { name: 'Salted Caramel', price: 299 },
      { name: 'Mango Filled', price: 299 },
      { name: 'Blue Berry Filled', price: 299 },
    ],
  },
  {
    category: 'Crafted',
    colorClass: 'bg-purple-50',
    headerClass: 'bg-purple-200 text-purple-900',
    items: [
      { name: 'Kinder Cream Indulgence', price: 429 },
      { name: 'Snickers', price: 429 },
      { name: 'Tiramisu Creme', price: 429 },
      { name: 'Kitkat Chocolate Crunch', price: 429 },
    ],
  },
  {
    category: 'Fresh Bakes',
    colorClass: 'bg-teal-50',
    headerClass: 'bg-teal-700 text-white',
    items: [
      { name: 'Baked Cinamon', price: 299 },
      { name: 'Butter Croissant', price: 299 },
      { name: 'Chocolate Croissant', price: 379 },
      { name: 'Butter Cream Croissant', price: 370 },
    ],
  },
  {
    category: 'Classic',
    colorClass: 'bg-orange-50',
    headerClass: 'bg-orange-200 text-orange-900',
    items: [
      { name: 'Vanilla Glazed (Hole)', price: 230 },
      { name: 'Classic Chocolate (Hole)', price: 230 },
      { name: 'Classic Orea (Hole)', price: 185 },
      { name: 'Chocolate Glazed (Hole)', price: 299 },
      { name: 'Chocolate Sprinkle (Hole)', price: 185 },
      { name: 'White Chocolate', price: 299 },
    ],
  },
  {
    category: 'Sandwiches',
    colorClass: 'bg-amber-50',
    headerClass: 'bg-amber-200 text-amber-900',
    items: [
      { name: 'Signature Chicken Sandwich', price: 349 },
      { name: 'Classic Scrambled Eggs', price: 349 },
      { name: 'Smoke Tikka Melt', price: 499 },
      { name: 'Sizziling Fagita Sandwich', price: 499 },
      { name: 'Signature Beef Melt', price: 499 },
    ],
  },
];

// Flat list of all items for building blank forms
export const ALL_ITEMS = SALEOUT_CATALOG.flatMap((cat) =>
  cat.items.map((item) => ({ category: cat.category, name: item.name, price: item.price, unit: 'per' }))
);
