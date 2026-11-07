// Version numbers: one for the site and one for every game, each with its whole history.
//
// The site gets a version for every commit to the repo: a new minor number for anything people
// can see or play (a game, a feature, a new look), a new patch number for fixes, deploy and
// setup work. A game's version moves only when that game changes: 1.0.0 is its first version,
// a new minor number brings it something new, a patch is a small fix or a change it only shares
// with other games, and a new major number is a rebuild. Every entry names the commit it came
// with (the newest one is the commit that adds it, so it names none); each one is also tagged
// in git as v<site version>.
//
// When you change the site: add an entry at the end of SITE, set the same number in
// package.json (test/versions.test.js checks they match), and add an entry to each game it
// changes.

export const SITE = [
  { v: '0.1.0', date: '2025-08-24', commit: 'd83c566', note: 'Initial commit' },
  { v: '0.1.1', date: '2025-08-24', commit: 'f0c46cd', note: 'First games: Number Guessing, Bottle Spin, Who is the Spy?, Tabu' },
  { v: '0.1.2', date: '2025-08-24', commit: 'ea6c042', note: 'First deploy test' },
  { v: '1.0.0', date: '2026-10-25', commit: '8bcb5af', note: 'Game rules window, Tailwind v4 and a polished look' },
  { v: '1.1.0', date: '2026-10-25', commit: 'a0ea385', note: 'New rules window, Bottle Spin rebuilt, Wordle parked' },
  { v: '1.2.0', date: '2026-10-25', commit: '2bd640d', note: 'Spy game rebuilt; all text follows the language setting' },
  { v: '1.3.0', date: '2026-10-25', commit: 'c146446', note: 'Category bar instead of the menu heading' },
  { v: '1.3.1', date: '2026-10-25', commit: '2b30265', note: 'Dev server open on the local network' },
  { v: '1.4.0', date: '2026-10-25', commit: '8a0f79a', note: 'Quiz Race online, a fresh look, Tabu rounds reworked' },
  { v: '1.4.1', date: '2026-10-25', commit: '413e587', note: 'IG comment picker and CV analyzer removed' },
  { v: '1.5.0', date: '2026-10-25', commit: '7481377', note: 'Every party game playable online across devices' },
  { v: '1.6.0', date: '2026-10-25', commit: '79639b9', note: 'Bottle Spin on one phone; Number Guessing restyled' },
  { v: '1.7.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green CRT terminal look; joining online rooms fixed' },
  { v: '1.8.0', date: '2026-10-25', commit: 'dc9760b', note: 'An address for every game and category; JetBrains Mono' },
  { v: '1.9.0', date: '2026-10-26', commit: '2ed0989', note: 'Menu of flip cards, lobby QR code, keyboard navigation' },
  { v: '1.9.1', date: '2026-10-26', commit: 'cd95527', note: 'Firebase Hosting cache updated after a deploy' },
  { v: '1.9.2', date: '2026-10-26', commit: 'fb2b888', note: 'Dev and prod sites with automatic deploys from GitHub' },
  { v: '1.9.3', date: '2026-10-26', commit: '9f4980c', note: 'DEV mark on the dev site and the local server' },
  { v: '1.9.4', date: '2026-10-26', commit: '1e9349e', note: 'Deploy actions off Node 20' },
  { v: '1.9.5', date: '2026-10-26', commit: '1867cae', note: 'Deploy trigger' },
  { v: '1.9.6', date: '2026-10-26', commit: '6bd5e51', note: 'Deploy trigger' },
  { v: '1.10.0', date: '2026-10-26', commit: '4cfe810', note: 'Flappy, solo and online' },
  { v: '1.11.0', date: '2026-10-26', commit: 'd3a04e8', note: 'Tank; the visitor’s IP in the prompt; an Online category' },
  { v: '1.12.0', date: '2026-10-26', commit: '031f28b', note: 'Sudoku; one arcade frame, loop and effects for all the games' },
  { v: '1.13.0', date: '2026-10-27', commit: '0c40f3d', note: 'Sudoku online race' },
  { v: '1.14.0', date: '2026-10-28', commit: 'a4ac45a', note: 'Users tab: who is online, their IP, and chats' },
  { v: '1.15.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites to online games from the Users chat' },
  { v: '1.16.0', date: '2026-10-28', commit: '3203918', note: 'Futsal, solo or online for up to 10' },
  { v: '1.17.0', date: '2026-10-28', commit: '8cca828', note: 'Futsal reworked' },
  { v: '1.18.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh, with a language menu' },
  { v: '1.18.1', date: '2026-10-28', commit: 'c8dfe77', note: 'Language menu stays open when focus goes nowhere' },
  { v: '1.19.0', date: '2026-10-28', commit: '121b94b', note: 'Doodle Race' },
  { v: '1.20.0', date: '2026-10-29', commit: '9fc5c65', note: 'Sunny Square, a 3D social world with its own server' },
  { v: '1.21.0', date: '2026-10-29', commit: '0964909', note: 'Sunny Square: simpler heads, a new camera, a town' },
  { v: '1.21.1', date: '2026-10-29', commit: 'bba5d56', note: 'Built sites use the world server on Google Cloud' },
  { v: '1.22.0', date: '2026-10-30', commit: 'f32488c', note: 'Chess' },
  { v: '1.23.0', date: '2026-10-30', commit: '8941ec8', note: 'Chess pieces drawn as a real set' },
  { v: '1.23.1', date: '2026-10-30', commit: 'fdc2249', note: 'Phones stop zooming while a game is open' },
  { v: '1.24.0', date: '2026-10-30', commit: '0a74707', note: 'Doodle Race: bigger board on phones, more words, colors' },
  { v: '1.25.0', date: '2026-10-30', commit: '498a41b', note: 'Password Hack' },
  { v: '1.26.0', date: '2026-10-30', commit: 'cb7bb13', note: 'Crater Duel' },
  { v: '1.27.0', date: '2026-10-30', commit: '941cd18', note: 'Crater Duel: molotovs, dynamite, ammo, ten maps' },
  { v: '1.28.0', date: '2026-10-30', commit: '326c61c', note: 'Quiz bank from 40 to 273 questions' },
  { v: '1.29.0', date: '2026-10-30', commit: '807882b', note: 'Dama' },
  { v: '1.30.0', date: '2026-10-31', commit: '8890f73', note: 'Dama stones drawn from above' },
  { v: '1.31.0', date: '2026-10-31', commit: 'd0463a9', note: 'Flappy: four levels' },
  { v: '1.32.0', date: '2026-11-01', commit: '48883f0', note: 'Futsal full screen' },
  { v: '1.32.1', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom anywhere; ASCII dropped from the names' },
  { v: '1.33.0', date: '2026-11-01', commit: '221a3ec', note: 'Bots and solo for Tank and Crater Duel' },
  { v: '1.33.1', date: '2026-11-01', commit: '25a7433', note: 'Futsal: a guest’s own player moves at once' },
  { v: '1.34.0', date: '2026-11-01', commit: 'fae9042', note: 'Flappy goes solo and harder; full screen for more games' },
  { v: '1.35.0', date: '2026-11-01', commit: '623881e', note: 'Tank rebuilt' },
  { v: '1.36.0', date: '2026-11-01', commit: 'b184ddb', note: 'Tank: kill list, colors, repair gift' },
  { v: '1.37.0', date: '2026-11-02', commit: '052de96', note: 'The host can move a lobby to another game' },
  { v: '1.38.0', date: '2026-11-02', commit: '2a9ccc5', note: 'Rooms stay open across games; Lobby tab, chat, profiles' },
  { v: '1.39.0', date: '2026-11-02', commit: '3d1cd53', note: 'Futsal: a new look' },
  { v: '1.40.0', date: '2026-11-02', commit: '8378ec8', note: 'Blackjack' },
  { v: '1.40.1', date: '2026-11-02', commit: 'cc277f1', note: 'Futsal back to its earlier look' },
  { v: '1.41.0', date: '2026-11-02', commit: 'e864a17', note: 'Blackjack in the online rooms, with no server' },
  { v: '1.42.0', date: '2026-11-02', commit: '295a221', note: 'The site’s version in the top bar' },
  { v: '1.42.1', date: '2026-11-02', commit: 'fb6c69d', note: 'Short, simple help behind [?]' },
  { v: '1.43.0', date: '2026-11-02', commit: 'a744391', note: 'Tank: rounds in a match, watching after you’re out' },
  { v: '1.44.0', date: '2026-11-02', commit: '3022633', note: 'Neon Laps' },
  { v: '1.45.0', date: '2026-11-03', commit: '548d9f5', note: 'Blackjack: side bets, full screen, emotes, a bar' },
  { v: '1.46.0', date: '2026-11-04', commit: '4025a57', note: 'Blackjack: pixel-art people at the table' },
  { v: '1.47.0', date: '2026-11-04', commit: 'b14812f', note: 'Blackjack: more detailed people, smoke you can see' },
  { v: '1.48.0', date: '2026-11-04', commit: '8456288', note: 'Blackjack: the man in the navy suit' },
  { v: '1.49.0', date: '2026-11-04', commit: 'c5a38dc', note: 'Blackjack: the man in the suit is animated' },
  { v: '1.49.1', date: '2026-11-04', commit: '3df5a60', note: 'Blackjack: the man in the suit plays his own frames' },
  { v: '1.50.0', date: '2026-11-04', commit: 'f78504d', note: 'Everyone’s picture is the man in the suit' },
  { v: '1.51.0', date: '2026-11-04', commit: '6b68d34', note: 'Crater Duel gets Tank’s match rounds, kill list and colors; version numbers for the site and every game' },
  { v: '1.52.0', date: '2026-11-04', commit: 'c486f59', note: 'Crater Duel in glowing vector graphics' },
  { v: '1.52.1', date: '2026-11-04', commit: 'ae9da2f', note: 'Crater Duel back to its earlier look' },
  { v: '1.53.0', date: '2026-11-04', commit: 'f0d22d9', note: 'Crater Duel in daylight pixel art, with pixel panels and controls' },
  { v: '1.54.0', date: '2026-11-04', commit: '9127e36', note: 'Crater Duel: bigger soldiers, rifles and shots; charging, a power gauge and a guide from the last shot' },
  { v: '1.55.0', date: '2026-11-04', commit: '4367e2e', note: 'Crater Duel: a simple aim, one line that grows with the power' },
  { v: '1.55.1', date: '2026-11-04', commit: '6e7759b', note: 'The Lobby page fits a phone: no more buttons running off the screen' },
  { v: '1.55.2', date: '2026-11-04', commit: 'b65cb42', note: 'Futsal guests see their own player where the host has it again, so it can’t walk into the ball' },
  { v: '1.56.0', date: '2026-11-04', commit: '6295836', note: 'Pick your character: the man in the suit, in the sweatshirt or in the hat, on the Users tab, in lobbies and their chat, and at the Blackjack table' },
  { v: '1.57.0', date: '2026-11-04', commit: '2feae0c', note: 'Blackjack: bets and side bets up to $10,000,000, with $25K, $100K and $1M chips' },
  { v: '1.58.0', date: '2026-11-07', commit: '512f3d9', note: 'Joining a lobby tries the direct link and the relay at once; Neon Laps arrows on phones; Doodle Race full screen sideways and shorter waits; Futsal empty nets; one unit a side in Crater Duel; no card numbers, medals or profile panel; the character is picked on the Users tab only' },
  { v: '1.59.0', date: '2026-11-07', note: 'Head Ball (Kafa Topu): one on one with big heads, solo against the computer or online, made for phones with full screen' }
]

export const GAMES = {
  tanks: [
    { v: '1.0.0', date: '2026-10-26', commit: 'd3a04e8', note: 'First version, online' },
    { v: '1.0.1', date: '2026-10-26', commit: '031f28b', note: 'Shares the arcade frame, loop and effects' },
    { v: '1.1.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '1.2.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '1.2.1', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom; named Tank' },
    { v: '1.3.0', date: '2026-11-01', commit: '221a3ec', note: 'Bots and a solo mode' },
    { v: '1.4.0', date: '2026-11-01', commit: 'fae9042', note: 'Full screen' },
    { v: '2.0.0', date: '2026-11-01', commit: '623881e', note: 'Rebuilt: vector graphics, a 2:1 arena, new maps, gifts, teleporters, damage you can see' },
    { v: '2.1.0', date: '2026-11-01', commit: 'b184ddb', note: 'Kill list, one color per tank, a repair gift' },
    { v: '2.1.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '2.2.0', date: '2026-11-02', commit: 'a744391', note: 'Rounds in a match; a destroyed player can watch' },
    { v: '2.2.1', date: '2026-11-02', commit: '3022633', note: 'Glow and particles shared with Neon Laps' },
    { v: '2.2.2', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  headball: [
    { v: '1.0.0', date: '2026-11-07', note: 'First version: solo against the computer or one on one online; six players to pick; phone buttons and full screen sideways' }
  ],
  futsal: [
    { v: '1.0.0', date: '2026-10-28', commit: '3203918', note: 'First version, solo or online for up to 10' },
    { v: '2.0.0', date: '2026-10-28', commit: '8cca828', note: 'Reworked: same-size players, a ball that never goes out, contact kicks' },
    { v: '2.1.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '2.2.0', date: '2026-11-01', commit: '48883f0', note: 'Full screen' },
    { v: '2.2.1', date: '2026-11-01', commit: '25a7433', note: 'A guest’s own player moves at once' },
    { v: '2.2.2', date: '2026-11-01', commit: 'fae9042', note: 'The shared full-screen switch' },
    { v: '2.2.3', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '2.3.0', date: '2026-11-02', commit: '3d1cd53', note: 'A new look: courts, kits, boards, goal effects' },
    { v: '2.3.1', date: '2026-11-02', commit: 'cc277f1', note: 'Back to the earlier look' },
    { v: '2.3.2', date: '2026-11-04', commit: 'b65cb42', note: 'A guest’s own player is drawn where the host has it again (the moving-ahead from 2.2.1 taken back): it went through the ball and other players on the guest’s screen; the connection corner goes with it' },
    { v: '2.4.0', date: '2026-11-07', commit: '512f3d9', note: 'Empty nets, no # inside; joining is quicker' }
  ],
  flappy: [
    { v: '1.0.0', date: '2026-10-26', commit: '4cfe810', note: 'First version, solo and online' },
    { v: '1.0.1', date: '2026-10-26', commit: 'd3a04e8', note: 'Shared arcade pieces' },
    { v: '1.0.2', date: '2026-10-26', commit: '031f28b', note: 'Shares the arcade frame, loop and effects' },
    { v: '1.1.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '1.2.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '1.3.0', date: '2026-10-31', commit: 'd0463a9', note: 'Four levels, sliding pipes on the hard ones' },
    { v: '1.3.1', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom; named Flappy' },
    { v: '2.0.0', date: '2026-11-01', commit: 'fae9042', note: 'A solo game that gets harder as you go' }
  ],
  crater: [
    { v: '1.0.0', date: '2026-10-30', commit: 'cb7bb13', note: 'First version, online' },
    { v: '1.1.0', date: '2026-10-30', commit: '941cd18', note: 'Molotovs, dynamite, limited ammo, ten maps, a new look' },
    { v: '1.2.0', date: '2026-11-01', commit: '221a3ec', note: 'Bots, a solo mode, up to six sides online' },
    { v: '1.3.0', date: '2026-11-01', commit: 'fae9042', note: 'Full screen' },
    { v: '1.3.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.4.0', date: '2026-11-04', commit: '6b68d34', note: 'From Tank: rounds in a match, a kill list, one color per player, YOU at the start, Eliminated that fades so you can watch, smoke and fire on hurt units, kills in the results' },
    { v: '2.0.0', date: '2026-11-04', commit: 'c486f59', note: 'Glowing vector graphics' },
    { v: '2.0.1', date: '2026-11-04', commit: 'ae9da2f', note: 'Back to the earlier look' },
    { v: '3.0.0', date: '2026-11-04', commit: 'f0d22d9', note: 'Daylight pixel art: skies with a sun and hills, a skyline or a cave wall; grass on banded, outlined dirt, brick rock, scorched craters; pixel soldiers, shots and explosions; a windsock; pixel panels, weapon icons and a big FIRE button' },
    { v: '3.1.0', date: '2026-11-04', commit: '9127e36', note: 'Bigger soldiers (half as tall again, hit anywhere on the body), a real rifle twice as long, shots twice the size; hold FIRE or Space to charge the power; a power gauge by the soldier and the angle by the sight; a band while dragging; last shot’s aim and landing as a guide; fine-aim buttons; Shift for slow aiming' },
    { v: '3.2.0', date: '2026-11-04', commit: '4367e2e', note: 'A simple aim: one line of dots from the gun, longer the more power, and an X where the last shot landed; no sight, gauge, labels, guide path or band on the battlefield' },
    { v: '3.3.0', date: '2026-11-07', commit: '512f3d9', note: 'One unit for each side, always; the Units each setting is gone; joining is quicker' }
  ],
  race: [
    { v: '1.0.0', date: '2026-11-02', commit: '3022633', note: 'First version, solo against bots or online' },
    { v: '1.1.0', date: '2026-11-07', commit: '512f3d9', note: 'Left and right arrows to steer on a phone, instead of the wheel; joining is quicker' }
  ],
  blackjack: [
    { v: '1.0.0', date: '2026-11-02', commit: '8378ec8', note: 'First version, solo or up to five at a table' },
    { v: '1.1.0', date: '2026-11-02', commit: 'e864a17', note: 'In the online rooms, the host’s device deals' },
    { v: '1.2.0', date: '2026-11-03', commit: '548d9f5', note: 'Side bets, full screen, pixel emotes, a bar and gifts' },
    { v: '1.3.0', date: '2026-11-04', commit: '4025a57', note: 'Pixel-art people who drink and smoke; $100,000 to start' },
    { v: '1.4.0', date: '2026-11-04', commit: 'b14812f', note: 'More detailed people, smoke you can see' },
    { v: '1.5.0', date: '2026-11-04', commit: '8456288', note: 'Everyone is the man in the navy suit' },
    { v: '1.6.0', date: '2026-11-04', commit: 'c5a38dc', note: 'He is animated and reacts to wins and losses' },
    { v: '1.6.1', date: '2026-11-04', commit: '3df5a60', note: 'He plays his own frames' },
    { v: '1.7.0', date: '2026-11-04', commit: '6295836', note: 'Each player sits as the character they picked: the man in the suit, in the sweatshirt or in the hat, drinking and smoking from their own frames' },
    { v: '1.8.0', date: '2026-11-04', commit: '2feae0c', note: 'Bets up to $10,000,000, side bets too (they had their own $1,000 limit); $25K, $100K and $1M chips' },
    { v: '1.8.1', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  sudoku: [
    { v: '1.0.0', date: '2026-10-26', commit: '031f28b', note: 'First version, solo' },
    { v: '1.1.0', date: '2026-10-27', commit: '0c40f3d', note: 'An online race' },
    { v: '1.2.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '1.3.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '1.3.1', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom; named Sudoku' },
    { v: '1.3.2', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.3.3', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  chess: [
    { v: '1.0.0', date: '2026-10-30', commit: 'f32488c', note: 'First version, one-on-one online' },
    { v: '1.1.0', date: '2026-10-30', commit: '8941ec8', note: 'Pieces drawn as a real set' },
    { v: '1.1.1', date: '2026-10-30', commit: '807882b', note: 'The board shared with Dama' },
    { v: '1.1.2', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom; named Chess' },
    { v: '1.1.3', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.1.4', date: '2026-11-02', commit: '295a221', note: 'A trimmer lobby' },
    { v: '1.1.5', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  dama: [
    { v: '1.0.0', date: '2026-10-30', commit: '807882b', note: 'First version, online Turkish draughts' },
    { v: '1.1.0', date: '2026-10-31', commit: '8890f73', note: 'Stones drawn from straight above' },
    { v: '1.1.1', date: '2026-11-01', commit: '65599bf', note: 'No phone zoom; named Dama' },
    { v: '1.1.2', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.1.3', date: '2026-11-02', commit: '295a221', note: 'A trimmer lobby' },
    { v: '1.1.4', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  world: [
    { v: '1.0.0', date: '2026-10-29', commit: '9fc5c65', note: 'First version, a 3D social world' },
    { v: '1.1.0', date: '2026-10-29', commit: '0964909', note: 'Simpler heads, an MMORPG camera, a town round the plaza' },
    { v: '1.1.1', date: '2026-10-29', commit: 'bba5d56', note: 'The world server on Google Cloud' }
  ],
  doodle: [
    { v: '1.0.0', date: '2026-10-28', commit: '121b94b', note: 'First version, online draw and guess' },
    { v: '1.1.0', date: '2026-10-30', commit: '0a74707', note: 'Bigger board on phones, 154 more words, colors' },
    { v: '1.2.0', date: '2026-11-01', commit: 'fae9042', note: 'Full screen for the drawer' },
    { v: '1.2.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.3.0', date: '2026-11-07', commit: '512f3d9', note: 'Full screen turns a phone sideways: the board as tall as the screen, the word and clock left of it, the tools right; 3 s to see the word instead of 6, 10 s to pick one instead of 15; joining is quicker' }
  ],
  hack: [
    { v: '1.0.0', date: '2026-10-30', commit: '498a41b', note: 'First version, in four languages' },
    { v: '1.0.1', date: '2026-11-01', commit: 'fae9042', note: 'Fits the arcade frame’s new header' }
  ],
  'quiz-race': [
    { v: '1.0.0', date: '2026-10-25', commit: '8a0f79a', note: 'First version, online' },
    { v: '1.0.1', date: '2026-10-25', commit: '7481377', note: 'Shares the party games’ online rooms' },
    { v: '1.1.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green terminal look' },
    { v: '1.2.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '1.3.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '1.4.0', date: '2026-10-30', commit: '326c61c', note: '273 questions, each with a level and a topic' },
    { v: '1.4.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.4.2', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  'number-guess': [
    { v: '1.0.0', date: '2025-08-24', commit: 'f0c46cd', note: 'First version' },
    { v: '1.1.0', date: '2026-10-25', commit: '2bd640d', note: 'Text follows the language setting' },
    { v: '1.2.0', date: '2026-10-25', commit: '79639b9', note: 'Restyled' },
    { v: '1.3.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green terminal look' }
  ],
  'bottle-spin': [
    { v: '1.0.0', date: '2025-08-24', commit: 'f0c46cd', note: 'First version' },
    { v: '2.0.0', date: '2026-10-25', commit: 'a0ea385', note: 'Rebuilt' },
    { v: '2.1.0', date: '2026-10-25', commit: '7481377', note: 'Online across devices' },
    { v: '3.0.0', date: '2026-10-25', commit: '79639b9', note: 'A game for one phone' },
    { v: '3.1.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green terminal look' },
    { v: '3.1.1', date: '2026-11-01', commit: 'fae9042', note: 'The bottle fits a phone held sideways' }
  ],
  'casus-kim': [
    { v: '1.0.0', date: '2025-08-24', commit: 'f0c46cd', note: 'First version' },
    { v: '2.0.0', date: '2026-10-25', commit: '2bd640d', note: 'Rebuilt' },
    { v: '2.1.0', date: '2026-10-25', commit: '7481377', note: 'Online across devices' },
    { v: '2.2.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green terminal look' },
    { v: '2.3.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '2.4.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '2.4.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '2.4.2', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ],
  tabu: [
    { v: '1.0.0', date: '2025-08-24', commit: 'f0c46cd', note: 'First version' },
    { v: '1.1.0', date: '2026-10-25', commit: '2bd640d', note: 'Text follows the language setting' },
    { v: '1.2.0', date: '2026-10-25', commit: '8a0f79a', note: 'Rounds reworked' },
    { v: '1.3.0', date: '2026-10-25', commit: '7481377', note: 'Online across devices' },
    { v: '1.4.0', date: '2026-10-25', commit: '16eaa9d', note: 'Green terminal look' },
    { v: '1.5.0', date: '2026-10-28', commit: 'c6662a0', note: 'Invites from the Users chat' },
    { v: '1.6.0', date: '2026-10-28', commit: '83a89aa', note: 'Russian and Kazakh' },
    { v: '1.6.1', date: '2026-11-02', commit: '2a9ccc5', note: 'The room stays open across games' },
    { v: '1.6.2', date: '2026-11-07', commit: '512f3d9', note: 'Joining is quicker: the direct link and the relay are tried at once' }
  ]
}

export const siteVersion = () => SITE[SITE.length - 1].v
/** A game's version now, or '' for one that has none (a Coming Soon card). */
export const gameVersion = (id) => GAMES[id]?.at(-1)?.v || ''
