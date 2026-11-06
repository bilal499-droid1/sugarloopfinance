// Master catalog — prices only changeable here (not editable in the entry form).
export const SALEOUT_CATALOG = [
  {
    category: 'Donuts',
    colorClass: 'bg-pink-50',
    headerClass: 'bg-pink-200 text-pink-900',
    items: [
      { name: 'Chocoholic', price: 299 },
      { name: 'Boston', price: 299 },
      { name: 'Nutella', price: 299 },
      { name: 'Coffee', price: 299 },
      { name: 'Lotus', price: 299 },
      { name: 'Brownie', price: 299 },
      { name: 'Butter Cream', price: 299 },
      { name: 'Mix Berry', price: 299 },
      { name: 'Salted Caramel', price: 299 },
      { name: 'Mango', price: 299 },
      { name: 'Blue Berry', price: 299 },
      { name: 'Tiramisu Crème', price: 429 },
      { name: 'Kinder Cream', price: 429 },
      { name: 'KitKat Crunch', price: 429 },
      { name: 'Vanilla Glazed (Hole)', price: 230 },
      { name: 'Classic Chocolate (Hole)', price: 230 },
      { name: 'Classic Oreo (Hole)', price: 185 },
      { name: 'Chocolate Sprinkle (Hole)', price: 185 },
      { name: 'White Chocolate (Hole)', price: 299 },
      { name: 'Chocolate Glazed (Hole)', price: 299 },
      { name: 'Snickers (Hole)', price: 429 },
    ],
  },
  {
    category: 'Croissants',
    colorClass: 'bg-teal-50',
    headerClass: 'bg-teal-700 text-white',
    items: [
      { name: 'Butter Cream Croissant', price: 370 },
      { name: 'Chocolate Croissant', price: 379 },
      { name: 'Butter Croissant', price: 299 },
      { name: 'Baked Cinnamon', price: 299 },
    ],
  },
  {
    category: 'Sandwich',
    colorClass: 'bg-amber-50',
    headerClass: 'bg-amber-200 text-amber-900',
    items: [
      { name: 'Signature Chicken Sandwich', price: 349 },
      { name: 'Classic Scrambled Eggs Sandwich', price: 349 },
      { name: 'Smoked Tikka Melt Sandwich', price: 499 },
      { name: 'Sizzling Fajita Sandwich', price: 499 },
      { name: 'Signature Beef Melt', price: 499 },
    ],
  },
  {
    category: 'Brownies',
    colorClass: 'bg-orange-50',
    headerClass: 'bg-orange-200 text-orange-900',
    items: [
      { name: 'Peanut Butter', price: 299 },
      { name: 'Classic Fudge', price: 299 },
      { name: 'Chocolate Bounty', price: 299 },
      { name: 'Brookie', price: 299 },
    ],
  },
];

// Flat list of all items for building blank forms
export const ALL_ITEMS = SALEOUT_CATALOG.flatMap((cat) =>
  cat.items.map((item) => ({ category: cat.category, name: item.name, price: item.price, unit: 'per' }))
);
