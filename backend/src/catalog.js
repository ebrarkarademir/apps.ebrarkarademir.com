// Everything the shop sells, priced here on the server. Clients get this list when they sign
// in and only draw the items; what anything costs, and who owns what, is decided here.
// A price of 0 means every player has it from the start.

const items = (kind, model, colors, price, extra = {}) => colors.map((color, i) => ({
  id: `${kind}-${model}-${color}`,
  kind,
  model,
  color,
  price: Array.isArray(price) ? price[i] : price,
  ...extra
}))

export const ITEMS = [
  ...items('top', 'tee', ['white', 'pink', 'sky', 'lemon', 'mint'], [0, 60, 60, 60, 60]),
  ...items('top', 'tank', ['coral', 'sky', 'black'], 50),
  ...items('top', 'hoodie', ['lilac', 'coral', 'navy', 'mint'], 150),
  ...items('top', 'sweater', ['cream', 'red', 'green'], 120),
  ...items('top', 'dress', ['pink', 'lemon', 'lilac'], 180),
  ...items('bottom', 'jeans', ['denim', 'black'], [0, 80]),
  ...items('bottom', 'shorts', ['denim', 'sky', 'pink'], 60),
  ...items('bottom', 'skirt', ['pink', 'navy', 'mint'], 70),
  ...items('bottom', 'joggers', ['gray', 'black', 'lilac'], 90),
  ...items('shoes', 'sneakers', ['white', 'red', 'black'], [0, 70, 70]),
  ...items('shoes', 'boots', ['brown', 'black'], 110),
  ...items('shoes', 'sandals', ['sky', 'pink'], 40),
  ...items('acc', 'cap', ['red', 'navy', 'mint'], 60),
  ...items('acc', 'glasses', ['black', 'gold'], 80),
  ...items('acc', 'bow', ['pink', 'red'], 50),
  ...items('acc', 'headphones', ['white', 'black'], 140),
  ...items('acc', 'scarf', ['red', 'mint'], 70),
  ...items('acc', 'flower', ['pink', 'lemon'], 40),
  ...items('acc', 'crown', ['gold'], 400),
  // Furniture: `size` is [width, depth] in floor cells before turning; `floor` items (rugs)
  // lie flat, so other furniture can stand on them
  ...items('furniture', 'bed', ['sky', 'pink'], 250, { size: [1, 2] }),
  ...items('furniture', 'sofa', ['mint', 'coral', 'gray'], 300, { size: [2, 1] }),
  ...items('furniture', 'armchair', ['lemon', 'sky'], 150, { size: [1, 1] }),
  ...items('furniture', 'chair', ['wood', 'white'], 60, { size: [1, 1] }),
  ...items('furniture', 'table', ['wood', 'white'], 100, { size: [1, 1] }),
  ...items('furniture', 'dining', ['wood'], 180, { size: [2, 1] }),
  ...items('furniture', 'lamp', ['white', 'gold'], 90, { size: [1, 1] }),
  ...items('furniture', 'plant', ['green'], 50, { size: [1, 1] }),
  ...items('furniture', 'cactus', ['green'], 60, { size: [1, 1] }),
  ...items('furniture', 'rug', ['pink', 'sky', 'lilac'], 120, { size: [2, 2], floor: true }),
  ...items('furniture', 'tv', ['black'], 350, { size: [2, 1] }),
  ...items('furniture', 'bookshelf', ['wood', 'white'], 200, { size: [2, 1] }),
  ...items('furniture', 'desk', ['wood'], 180, { size: [2, 1] }),
  ...items('furniture', 'wardrobe', ['white', 'wood'], 220, { size: [2, 1] }),
  ...items('furniture', 'beanbag', ['pink', 'lemon', 'sky'], 80, { size: [1, 1] }),
  ...items('furniture', 'teddy', ['brown'], 70, { size: [1, 1] }),
  ...items('furniture', 'aquarium', ['sky'], 400, { size: [2, 1] }),
  ...items('furniture', 'piano', ['black'], 500, { size: [2, 1] })
]

export const ITEM = Object.fromEntries(ITEMS.map(item => [item.id, item]))

// A new player's home comes furnished with these
export const STARTER = {
  'furniture-bed-sky': 1,
  'furniture-rug-pink': 1,
  'furniture-table-wood': 1,
  'furniture-chair-wood': 1,
  'furniture-plant-green': 1,
  'furniture-lamp-white': 1
}

// Cells on the 8×8 floor; r is quarter turns
export const DEFAULT_LAYOUT = [
  { i: 'furniture-bed-sky', x: 0, z: 0, r: 0 },
  { i: 'furniture-lamp-white', x: 1, z: 0, r: 0 },
  { i: 'furniture-rug-pink', x: 3, z: 3, r: 0 },
  { i: 'furniture-table-wood', x: 5, z: 1, r: 0 },
  { i: 'furniture-chair-wood', x: 4, z: 1, r: 1 },
  { i: 'furniture-plant-green', x: 7, z: 0, r: 0 }
]

export const owns = (item, inventory) => item.price === 0 || (inventory[item.id] || 0) > 0
