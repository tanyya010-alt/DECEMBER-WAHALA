# 🎄 DECEMBER WAHALA: A Naija Detty Christmas Simulation

A shared-city life sim set in **Lagos** and **Abuja** during Detty December. Create a 3D character, find out who you really are this December, and live 31 days of owambes, IJGBs, traffic, black tax and pure enjoyment — alongside real players.

**Everybody looks like they're having the perfect December. Everybody is hiding something.**

## How it plays

**An explorable city.** Lagos (mainland, lagoon, bridges, the Island, the beach) or Abuja (Ring Road park, Jabi Lake, Aso Rock) in low-poly 3D. Walk with **WASD / arrow keys** (Shift to run) or the on-screen joystick on phones. Press **E** (or ✋) to go inside places and talk to people. The camera follows you; buildings, stalls, water and trees block your way; cars stop for you.

**Real time.** One real second is one game minute at normal speed (⏸ ▶ ▶▶ ▶▶▶, or Space and 1–3). A game day is about 24 real minutes. Activities like eating, partying and sleeping fast-forward while they run, and so do rides.

**25 places with opening hours**: your flat (with a walk-in 3D interior: bed, stove, TV, desk, mirror), family house, hotel, Mama T's Kitchen, Chop Republic, Island Grill, Bean & Breeze Café, the suya spot, Club Eko, the rooftop lounge, the concert grounds, the owambe hall, the beach, the Detty Wall photo spot, Palms Mall, the fashion house, salon, gym, bank, BDC, office, Computer Village, Tejuosho Market, the bus stop, church — and the airport by ride.

**People with routines.** Kemi, Dayo, Big Tunde, Mama Nkechi, Seun, Cousin Tobi, Aunty Funke, Chidi, Mama, Mama T, Promoter Biggie, Bouncer Sule and Uncle Taiwo walk the streets on daily schedules (café → photo spot → mall → lounge → club), plus strangers going about their day. Diaspora family land on set days.

**Conversations and memory.** Gist, answer questions ("Guy, you dey go Club Eko tonight?"), give gifts or money, flirt, ask people out, ask for favours. People remember what you did — helped, lied, exposed, ignored, embarrassed, blackmailed — and greet you accordingly.

**Secrets.** Dig into someone's story, then keep it, use it to become friends, tell someone, trade it, expose it, or demand money — and live with the consequences. Four story chains run across the month (*The Range Rover*, *Which Tube Stop?*, *Cousin From London*, *Card Declined*).

**Eight personas** (Real IJGB, Wannabe IJGB, Japa Returnee, First-Timer Diaspora, Local Hustler, Soft-Life Influencer, Chief's Pikin, Owambe Aunty/Uncle), each with a resource, an ability, a weakness, a secret and a mission — and the world treats each one differently.

**Getting around.** Walk (auto-walk from the map), danfo (from the bus stop), keke, okada (banned on the bridge) or Bolt (surge pricing). Traffic depends on time of day, concert days and peak December: "12 min → 35 min".

**Phone.** WhatsApp (invitations, family requests, brand deals, gossip, dates), Gram (post and read the comments), Bank, Ride, Calendar and Missions. Say yes to a plan and you're expected to show up.

**Fashion.** Nine styles from luxury streetwear to aso-ebi, plus shoes, bags and jewellery you can see on your character. Fits "eat" at matching places; the bouncer turns away slippers.

**December.** Warm-up → Diaspora arrivals → Getting serious → Peak December → Christmas → Post-Christmas madness → Crossover. Christmas lights go up mid-month, Saturdays are owambes, the stage lights up on concert nights, and fireworks go off on the 31st.

**The ending** is your December biography: money in and out, parties, relationships, friends, secrets, wahalas survived, your December reputation (Everybody's Padi, Professional Amebo, Biggest Fraud of December…), a verdict, achievements and memories — with a button to copy it for sharing.

## Online

- Accounts with username + password (18+), cookie sessions, passwords hashed with scrypt.
- Your December saves to your account after every move.
- The shared city shows who's online, where other players are on the map, and a live news ticker.
- Player-to-player gist, investigate, expose and protect, with an inbox for what others did to you while you were away.
- If the server can't be reached, the game offers offline guest play that saves on the device.

## Code

| Path | Purpose |
| --- | --- |
| `index.html`, `css/style.css` | Page and styles |
| `js/data.js` | Personas, traits, goals, looks and styles, random events |
| `js/world-data.js` | Street grid, places and hours, actions, items, people and schedules, questions, story chains, missions, identities, achievements |
| `js/nav.js` | Road graph and A* paths |
| `js/sim.js` | The real-time game engine (DOM-free; runs in Node for tests) |
| `js/world3d.js` | The 3D city, movement, collisions, camera, people, day/night, home interior |
| `js/avatar3d.js` | Rigged low-poly 3D characters (three.js r128, vendored in `js/vendor/`) |
| `js/avatar.js` | Flat SVG characters for portraits and lists |
| `js/app.js` | Landing, accounts, creator, HUD, panels, phone, ending |
| `api/*.js` | Vercel serverless API (signup, login, logout, me, save, city, interact, inbox) |
| `db/schema.sql` | Postgres schema (Neon) |

## Develop

```sh
npm install
npm test                    # simulated Decembers + API tests on in-memory Postgres
node test/dev-server.js     # http://localhost:3000 with an in-memory database
```

Set `DATABASE_URL` to use a real Postgres instead. Apply the schema with `DATABASE_URL=... node db/migrate.js`.

## Deploy

Vercel project with the `DATABASE_URL` environment variable pointing at Neon. Functions run in London (`lhr1`) next to the database.
