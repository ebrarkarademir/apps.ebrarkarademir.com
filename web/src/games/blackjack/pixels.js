// Pixel art for the table's emotes and its bar: tiny sprites drawn as rows of letters, one letter
// a pixel (see PALETTE; '.' is see-through), turned into SVG images that stay sharp at any size.
// Emotes are 12×12 icons in an 18×19 speech bubble; the bar's things are 16×16, standing on the
// table on their bottom row or near it.

export const PALETTE = {
  k: '#2b1d16', // outline
  w: '#ffffff',
  W: '#f4ecd8', // cream
  s: '#cfd6dc', // light grey: glass, smoke
  g: '#8e98a3',
  G: '#545c66',
  r: '#e8463c',
  R: '#a01f2b',
  o: '#f39a2b',
  O: '#c4621a',
  y: '#ffd84a',
  Y: '#d19b1d', // gold
  l: '#8fdc5a',
  e: '#3fa34d',
  E: '#23663a',
  c: '#a8e6ff', // pale blue: water, ice
  b: '#4aa3e8',
  B: '#2c5fb3',
  p: '#ff8fc0',
  P: '#a54dc9',
  t: '#c07a42', // bread, wood
  T: '#6e4123',
  f: '#f7c99b', // skin
  a: '#8a2c14' // tea
}

// ---------- Emotes, 12×12 ----------

export const EMOTE_ART = {
  heart: [
    '............',
    '..kk....kk..',
    '.krrk..krrk.',
    'krwrrkkrrrrk',
    'krrrrrrrrrrk',
    'krrrrrrrrrRk',
    '.krrrrrrrRk.',
    '..krrrrrRk..',
    '...krrrRk...',
    '....krRk....',
    '.....kk.....',
    '............'
  ],
  laugh: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kyyyyyyyyk.',
    'kyykyyyykyyk',
    'kykykyykykyk',
    'kbyyyyyyyybk',
    'kbykkkkkkybk',
    'kyykRRRRkyyk',
    '.kyykrrkyyk.',
    '..kyykkyyk..',
    '...kkkkkk...',
    '............'
  ],
  cry: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kyyyyyyyyk.',
    'kyyyyyyyyyyk',
    'kykkyyyykkyk',
    'kybyyyyyybyk',
    'kybyykkyybyk',
    'kybykyykybyk',
    '.kbyyyyyybk.',
    '..kbyyyybk..',
    '...kkkkkk...',
    '............'
  ],
  angry: [
    '...kkkkkk...',
    '..krrrrrrk..',
    '.krrrrrrrrk.',
    'kkkrrrrrrkkk',
    'krrkkrrkkrrk',
    'krrkrrrrkrrk',
    'krrrrrrrrrrk',
    'krrrkkkkrrrk',
    '.krkrrrrkrk.',
    '..krrrrrrk..',
    '...kkkkkk...',
    '............'
  ],
  cool: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kyyyyyyyyk.',
    'kkkkkkkkkkkk',
    'kkGkkyykGkkk',
    'kykkkyykkkyk',
    'kyyyyyyyyyyk',
    'kyyyyyyykyyk',
    '.kyykkkkkyk.',
    '..kyyyyyyk..',
    '...kkkkkk...',
    '............'
  ],
  money: [
    '....k..k....',
    '....kkkk....',
    '.....kk.....',
    '....kYYk....',
    '...kyyyyk...',
    '..kyyYYYyk..',
    '.kyyYyyyyyk.',
    '.kyyyYYyyyk.',
    '.kyyyyyYyyk.',
    '.kyyYYYyyyk.',
    '..kyyyyyyk..',
    '...kkkkkk...'
  ],
  wow: [
    '....kkkk....',
    '....krrk....',
    '....krrk....',
    '....krrk....',
    '....krrk....',
    '....krrk....',
    '....kRRk....',
    '.....kk.....',
    '............',
    '....kkkk....',
    '....krrk....',
    '....kkkk....'
  ],
  think: [
    '...kkkkk....',
    '..kbbbbbk...',
    '.kbbkkkbbk..',
    '.kkk..kbbk..',
    '.....kbbk...',
    '....kbbk....',
    '....kbbk....',
    '....kkkk....',
    '............',
    '....kkkk....',
    '....kbbk....',
    '....kkkk....'
  ],
  thumbs: [
    '......kk....',
    '.....kffk...',
    '.....kffk...',
    '....kfffk...',
    'kkk.kffffkk.',
    'kBkkfffffffk',
    'kBkfffffkkkk',
    'kBkffffffffk',
    'kBkfffffkkkk',
    'kBkffffffffk',
    'kBkkfffffkk.',
    'kkk.kkkkk...'
  ],
  gg: [
    '............',
    '............',
    '.EEE...EEE..',
    'E...E.E...E.',
    'E.....E.....',
    'E.EEE.E.EEE.',
    'E...E.E...E.',
    'E...E.E...E.',
    '.EEE...EEE..',
    '............',
    '............',
    '............'
  ],
  fire: [
    '.....k......',
    '....kok.....',
    '....kook....',
    '..k.koook...',
    '.kokoooyok..',
    '.koooyyyok..',
    'kooyoyyyook.',
    'kooyyyyyyok.',
    'koyyywwyyok.',
    '.koyywwyok..',
    '..kooooook..',
    '...kkkkkk...'
  ],
  skull: [
    '............',
    '...kkkkkk...',
    '..kwwwwwwk..',
    '.kwwwwwwwwk.',
    '.kwkkwwkkwk.',
    '.kwkkwwkkwk.',
    '.kswwkkwwsk.',
    '..kkwwwwkk..',
    '...kwkwkk...',
    '...kkkkkk...',
    '............',
    '............'
  ],
  sweat: [
    '......k.....',
    '.....kbk....',
    '.....kbk....',
    '....kbbbk...',
    '....kbbbk...',
    '...kbbbbbk..',
    '...kbwbbbk..',
    '...kbwbbbk..',
    '...kbbbbbk..',
    '....kbbbk...',
    '.....kkk....',
    '............'
  ],
  sleep: [
    '.........bbb',
    '..........b.',
    '.........bbb',
    '.....bbbb...',
    '.......b....',
    '......b.....',
    '.....bbbb...',
    'BBBBB.......',
    '...B........',
    '..B.........',
    '.B..........',
    'BBBBB.......'
  ],
  party: [
    '.r...y....e.',
    '....yyy.....',
    '.....k...b..',
    '....kpk.....',
    '.e..kpk.....',
    '...kbppk..r.',
    '...kpbpk....',
    '..kpppbpk...',
    '..kbpppbk.y.',
    '.kpbpppbpk..',
    '.kkkkkkkkk..',
    '............'
  ],
  clover: [
    '.kkk..kkk...',
    'kllekkllek..',
    'kllekkllek..',
    'keeekkeeek..',
    '.kkk..kkk...',
    'kllekkllek..',
    'kllekkllek..',
    'keeekkeeek..',
    '.kkk..kkkk..',
    '.........kek',
    '..........kk',
    '............'
  ]
}

// The speech bubble round an emote, its tail pointing down at the one who sent it
export const BUBBLE = [
  '..kkkkkkkkkkkkkk..',
  '.kwwwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwwwk.',
  '..kkkkkwwkkkkkkk..',
  '......kwwk........',
  '......kwk.........',
  '......kk..........'
]

// ---------- The bar, 16×16 ----------

// A simit: a ring of bread crusted with sesame, drawn rather than typed out
function simit () {
  const rows = []
  for (let y = 0; y < 16; y++) {
    let row = ''
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5
      const dy = (y - 7.6) * 1.18
      const d = Math.hypot(dx, dy)
      if (d > 7.7) row += '.'
      else if (d > 6.6) row += 'k'
      else if (d > 3.1) row += (x * 5 + y * 3) % 7 === 0 ? 'W' : dx + dy > 2.5 ? 'O' : 't'
      else if (d > 2) row += 'k'
      else row += '.'
    }
    rows.push(row)
  }
  return rows
}

const BLANK = '................'

export const ITEM_ART = {
  tea: [
    BLANK, BLANK, BLANK,
    '....kkkkkkkk....',
    '....kssssssk....',
    '....kOOOOOOk....',
    '.....kaaaak.....',
    '......kaak......',
    '.....kaaaak.....',
    '....kwaaaaak....',
    '....kaaaaaak....',
    '.....kkkkkk.....',
    '..kkkkkkkkkkkk..',
    '..krWWWWWWWWrk..',
    '...kkkkkkkkkk...',
    BLANK
  ],
  coffee: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '....kkkkkkkk....',
    '....kttTTttk....',
    '....kWWWWWWkkk..',
    '....kWbWWbWk.k..',
    '....kWWWWWWkkk..',
    '.....kWWWWk.....',
    '..kkkkkkkkkkkk..',
    '..krWWWWWWWWrk..',
    '...kkkkkkkkkk...',
    BLANK
  ],
  cola: [
    BLANK,
    '..........kk....',
    '.........krk....',
    '........krk.....',
    '....kkkkkrkkk...',
    '....ksssssssk...',
    '....kTcTTTTTk...',
    '....kTTTTcTTk...',
    '....kTcTTTTTk...',
    '....kTTTTTTTk...',
    '....kTTTcTTTk...',
    '....kTTTTTTTk...',
    '....kTTTTTTTk...',
    '.....kTTTTTk....',
    '.....kkkkkkk....',
    BLANK
  ],
  beer: [
    BLANK, BLANK,
    '...kkk.kkkk.....',
    '..kwwwkwwwwk....',
    '..kwwwwwwwwkkk..',
    '..kyywyyyyyk..k.',
    '..kyyyyywyyk..k.',
    '..kyywyyyyyk..k.',
    '..kyyyyyyyyk..k.',
    '..kyyyywyyykkk..',
    '..kyyyyyyyyk....',
    '..kyyyyyyyyk....',
    '..kYyyyyyyYk....',
    '..kYYYYYYYYk....',
    '..kkkkkkkkkk....',
    BLANK
  ],
  wine: [
    BLANK, BLANK,
    '....kkkkkkkk....',
    '....kssssssk....',
    '....kRRRRRRk....',
    '....krrrrrRk....',
    '....kwrrrrRk....',
    '.....krrrRk.....',
    '......kkkk......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.....kssssk.....',
    '....kkkkkkkk....',
    BLANK
  ],
  raki: [
    BLANK, BLANK,
    '...kkkkk........',
    '...ksssk........',
    '...kWWWk........',
    '...kWWWk........',
    '...kWwWk.kkkkk..',
    '...kWWWk.kccck..',
    '...kWWWk.kccck..',
    '...kWwWk.kcwck..',
    '...kWWWk.kccck..',
    '...kWWWk.kccck..',
    '...kWWWk.kccck..',
    '...kWWWk.kccck..',
    '...kkkkk.kkkkk..',
    BLANK
  ],
  cocktail: [
    '..........yyy...',
    '.........yyyyy..',
    '...........T....',
    '..kkkkkkkkkTkk..',
    '..kppppppppTpk..',
    '...kppppppppk...',
    '....kppppppk....',
    '.....kppppk.....',
    '......kppk......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    BLANK
  ],
  whiskey: [
    BLANK, BLANK, BLANK, BLANK, BLANK,
    '...kkkkkkkkkk...',
    '...kssssssssk...',
    '...kOcccOOOOk...',
    '...kOcwcOOOOk...',
    '...kOcccOccck...',
    '...koOOOOcwck...',
    '...kOOOOOccck...',
    '...kkkkkkkkkk...',
    '...kGGGGGGGGk...',
    '...kkkkkkkkkk...',
    BLANK
  ],
  champagne: [
    '.......kk.......',
    '......kttk......',
    '......kYYk......',
    '......kYYk......',
    '......kYYk......',
    '.....kEEEEk.....',
    '....kEeEEEEk....',
    '....kEeEEEEk....',
    '....kYYYYYYk....',
    '....kYwwwwYk....',
    '....kYYYYYYk....',
    '....kEeEEEEk....',
    '....kEeEEEEk....',
    '....kEEEEEEk....',
    '....kkkkkkkk....',
    BLANK
  ],
  cigarette: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '.kkkkkkkkkkkkkk.',
    '.koowwwwwwwwgrk.',
    '.kkkkkkkkkkkkkk.',
    '..kgggggggggggk.',
    '..kGGGGGGGGGGGk.',
    '...kkkkkkkkkkk..',
    BLANK
  ],
  cigar: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '..kkkkkkkkkkkk..',
    '.kTttttYYttttgrk',
    '.kTTTTTYYTTTTggk',
    '..kkkkkkkkkkkk..',
    '..kGGGGGGGGGGGk.',
    '...kkkkkkkkkkk..',
    BLANK
  ],
  hookah: [
    '......kkkk......',
    '.....krorok.....',
    '.....kTTTTk.....',
    '......kTTk......',
    '....kkkkkkkk....',
    '......kYYk......',
    '......kYYkkk....',
    '......kYYkPPk...',
    '......kYYk.kPk..',
    '.....kkYYkk.kPk.',
    '....kbbbbbbk.kPk',
    '...kbbwbbbbbk.kY',
    '...kbbbbbwbbk.kk',
    '...kbwbbbbbbk...',
    '....kbbbbbbk....',
    '.....kkkkkk.....'
  ],
  nuts: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '......kkkk......',
    '....kktOtTkk....',
    '...ktOtWtOtTk...',
    '..ktTtOtTtWtTk..',
    '.kkkkkkkkkkkkkk.',
    '.kBbbbbbbbbbbBk.',
    '..kBbbbbbbbbBk..',
    '...kBbbbbbbBk...',
    '....kkkkkkkk....',
    BLANK
  ],
  simit: simit(),
  fries: [
    BLANK, BLANK,
    '....kk.kk.kk....',
    '...kyykyykyyk...',
    '...kyykyykyyk...',
    '..kkyyYyyYyykk..',
    '..kyyyYyyYyyyk..',
    '.kkrrrrrrrrrrkk.',
    '.krrrrrrrrrrrrk.',
    '..kwwwwwwwwwwk..',
    '..krrrrrrrrrrk..',
    '...krrrrrrrrk...',
    '...krrrrrrrrk...',
    '...kRRRRRRRRk...',
    '...kkkkkkkkkk...',
    BLANK
  ],
  pizza: [
    BLANK, BLANK,
    '..kkkkkkkkkkkk..',
    '..kttttttttttk..',
    '..kyyyRRyyyyyk..',
    '...kyyRRyyRyk...',
    '...kyyyyyRRyk...',
    '....kyRyyyyk....',
    '....kRRyyyyk....',
    '.....kyyRyk.....',
    '.....kyyyyk.....',
    '......kyyk......',
    '......kyyk......',
    '.......kk.......',
    BLANK, BLANK
  ],
  burger: [
    BLANK, BLANK, BLANK, BLANK,
    '.....kkkkkk.....',
    '...kktWttWtkk...',
    '..kttttWtttttk..',
    '..kttttttttttk..',
    '.klelllellelllk.',
    '..krrrrrrrrrrk..',
    '.kyyyyyyyyyyyyk.',
    '..kTTTTTTTTTTk..',
    '..kTTTTTTTTTTk..',
    '..kttttttttttk..',
    '...kkkkkkkkkk...',
    BLANK
  ],
  doner: [
    '.......kk.......',
    '.......gg.......',
    '.....kkkkkk.....',
    '....kOttttTk....',
    '....kOTTTTTk....',
    '....kOttttTk....',
    '.....kOtTTk.....',
    '.....kOTTTk.....',
    '......kOtk......',
    '......kOTk......',
    '.......kk.......',
    '.......gg.......',
    '.......gg.......',
    '....kkkkkkkk....',
    '....kGGGGGGk....',
    '....kkkkkkkk....'
  ],
  rose: [
    BLANK,
    '......kkkk......',
    '.....krRrrk.....',
    '....krrRRrrk....',
    '....krRrrRrk....',
    '....kRrrrrRk....',
    '.....krrrrk.....',
    '......kkkk......',
    '.......ke.......',
    '....kk.ke.......',
    '...kllkke.......',
    '....kkkke.......',
    '.......ke..kk...',
    '.......kekllk...',
    '.......ke.kk....',
    '.......ke.......'
  ],
  duck: [
    BLANK, BLANK, BLANK,
    '......kkkk......',
    '.....kyyyyk.....',
    '.....kykyyk.....',
    '..kkkkyyyyk.....',
    '..kooooyyyk..kk.',
    '...kkkyyyykkkyk.',
    '....kyyyyyyyyyk.',
    '...kyyyyyyyyyyk.',
    '...kyyyyYyyyyyk.',
    '...kyyyYYYyyyyk.',
    '....kyyyyyyyyk..',
    '.....kkkkkkkk...',
    BLANK
  ],
  lemon: [
    BLANK, BLANK, BLANK, BLANK, BLANK,
    '..........ee....',
    '......kkkkke....',
    '....kkyyyyykk...',
    '...kyyywyyyyyk..',
    '..kyywwyyyyyyyk.',
    '.kyyywyyyyyyyyyk',
    '..kyyyyyyyyyyyk.',
    '...kyyyyyyyyYk..',
    '....kkYYYYYkk...',
    '......kkkkk.....',
    BLANK
  ],
  tissues: [
    BLANK, BLANK,
    '.......ww.......',
    '......wwsw......',
    '.....kwwwwk.....',
    '..kkkkkwwkkkkk..',
    '..kbbbbbbbbbbk..',
    '..kbpbbbbbbpbk..',
    '..kbbbbpbbbbbk..',
    '..kbbbbbbbbbbk..',
    '..kbpbbbbbbpbk..',
    '..kbbbbpbbbbbk..',
    '..kbbbbbbbbbbk..',
    '..kBBBBBBBBBBk..',
    '..kkkkkkkkkkkk..',
    BLANK
  ],
  toilet: [
    BLANK, BLANK,
    '.....kkkkkk.....',
    '....kwwwwwwk....',
    '....kwwkkwwk....',
    '....kswwwwsk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwwwwwwkk...',
    '....kwwwwwwkwk..',
    '....kwwwwwwkwk..',
    '....kswwwwskwk..',
    '.....kkkkkk.kwk.',
    '............kk..',
    BLANK
  ],
  fish: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '......kkkkk.....',
    '....kkbbbbbk..kk',
    '...kbbbbbbbbkkbk',
    '..kbwkbbbbbbbbbk',
    '..kbbbbbbbbbbbbk',
    '...kccccccccbkbk',
    '....kkccccck..kk',
    '......kkkkk.....',
    BLANK
  ],
  cloud: [
    BLANK, BLANK, BLANK,
    '......kkk.......',
    '.....ksssk.kk...',
    '..kkkssgggkgskk.',
    '.kssggggggggggk.',
    'ksgggggggggggggk',
    'kGggggggggggggGk',
    '.kGGGGGGGGGGGGk.',
    '..kkkkkkkkkkkk..',
    BLANK, BLANK, BLANK, BLANK, BLANK
  ],
  horseshoe: [
    BLANK, BLANK, BLANK, BLANK,
    '...kkk....kkk...',
    '..kyyk....kyyk..',
    '..kyYk....kYyk..',
    '..kykk....kkyk..',
    '..kyYk....kYyk..',
    '..kykk....kkyk..',
    '..kyyYk..kYyyk..',
    '...kyyYkkYyyk...',
    '....kyyyyyyk....',
    '.....kkkkkk.....',
    BLANK, BLANK
  ],
  trophy: [
    BLANK, BLANK,
    '...kkkkkkkkkk...',
    '.kkkyywyyyyykkk.',
    '.k.kyywyyyyyk.k.',
    '.k.kyywyyyyyk.k.',
    '.kkkyyyyyyyykkk.',
    '...kyyyyyyyyk...',
    '....kyyyyyyk....',
    '.....kYyyYk.....',
    '......kyyk......',
    '......kyyk......',
    '.....kkkkkk.....',
    '....kTTTTTTk....',
    '....kkkkkkkk....',
    BLANK
  ],
  crown: [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '..k....kk....k..',
    '.kyk..kyyk..kyk.',
    '.kyyk.kyyk.kyyk.',
    '.kyyykyyyykyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kyyryybbyyryyk.',
    '.kyyyyyyyyyyyyk.',
    '.kYYYYYYYYYYYYk.',
    '.kkkkkkkkkkkkkk.',
    BLANK
  ]
}

// ---------- Buttons ----------

export const UI_ART = {
  gift: [
    BLANK, BLANK,
    '....kkk..kkk....',
    '...kyyyk.kyyyk..',
    '....kkyykyykk...',
    '.kkkkkkkkkkkkkk.',
    '.krrrrryyrrrrrk.',
    '.kkkkkkkkkkkkkk.',
    '..krrrryyrrrrk..',
    '..kRrrryyrrrrk..',
    '..krrrryyrrrrk..',
    '..krrrryyrrrrk..',
    '..kRrrryyrrrrk..',
    '..kRRRRyyRRRRk..',
    '..kkkkkkkkkkkk..',
    BLANK
  ]
}

// ---------- Making images ----------

/** Rows of letters as an SVG: one path per colour, each row's runs of a colour as rectangles. */
export function spriteSvg (rows) {
  const height = rows.length
  const width = rows[0].length
  const paths = new Map()
  rows.forEach((row, y) => {
    for (let x = 0; x < width;) {
      const ch = row[x]
      let end = x + 1
      while (end < width && row[end] === ch) end++
      if (ch !== '.' && PALETTE[ch]) paths.set(ch, (paths.get(ch) || '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
      x = end
    }
  })
  const body = [...paths].map(([ch, d]) => `<path fill="${PALETTE[ch]}" d="${d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`
}

/** Paints sprites ({ rows, x, y }) over one another on a width × height grid. */
export function compose (width, height, layers) {
  const grid = Array.from({ length: height }, () => Array(width).fill('.'))
  for (const { rows, x = 0, y = 0 } of layers) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.' && grid[y + j]) grid[y + j][x + i] = row[i]
    })
  }
  return grid.map(row => row.join(''))
}

const urls = new Map()
function url (key, make) {
  if (!urls.has(key)) {
    const rows = make()
    urls.set(key, rows ? `data:image/svg+xml,${encodeURIComponent(spriteSvg(rows))}` : '')
  }
  return urls.get(key)
}

/** An emote in its speech bubble, as an image URL. */
export const emoteUrl = (id) => url(`emote:${id}`, () => EMOTE_ART[id] && compose(BUBBLE[0].length, BUBBLE.length, [{ rows: BUBBLE }, { rows: EMOTE_ART[id], x: 3, y: 2 }]))

/** Something from the bar, as an image URL. */
export const itemUrl = (id) => url(`item:${id}`, () => ITEM_ART[id])

/** A button's picture: one of UI_ART, or a bare emote. */
export const iconUrl = (id) => url(`icon:${id}`, () => UI_ART[id] || EMOTE_ART[id])
