# 🎄 DECEMBER WAHALA: A Naija Detty Christmas Simulation

A shared-city life sim set in **Lagos** and **Abuja** during Detty December. Create a 3D character, find out who you really are this December, and live 31 days of owambes, IJGBs, traffic, black tax and pure enjoyment — alongside real players.

**Everybody looks like they're having the perfect December. Everybody is hiding something.**

## How it plays

1. **Create your Sim** in a 3D drag-to-spin creator: body, 9 women's and 7 men's hairstyles, hair colour, skin tone, 8 Detty December outfit styles (luxury streetwear, Afro-chic, party glam, old money, Y2K, all-black, resort, trad fusion), fabric (Ankara, Adire, Aso-oke, sequin), colours, shades, chain, gele or fila, beard.
2. **Pick 2 traits** (Owambe Spirit, Smooth Talker, Amebo, Hustle Brain, Prayer Warrior…) and a **December goal** (Detty Legend, Go Viral, Love by Crossover, Who Are You Really?…).
3. **"Who You Be?"** — your traits and goal decide your persona. Each has a unique resource, a superpower, a weakness and a **secret**:

| Persona | Resource | Superpower | Weakness | Secret |
| --- | --- | --- | --- | --- |
| 🧳 Real IJGB | Dollars | Abroad Price / Dollar Rain | Vendors charge 25% more; family demands | Dollars are mostly credit card |
| 🎭 Wannabe IJGB | Authenticity | Fake It (free clout) | Questions can blow your cover | Never left Nigeria |
| ✈️ Japa Returnee | Japa Knowledge | I Know The Process | "How do I come?" | Struggling abroad |
| 👶🏾 First-Timer Diaspora | Culture Points | Auntie Adoption | Culture shock | Doesn't get half the culture |
| 💪🏾 Local Hustler | Hustle | I Know A Guy (half price) | Burnout | A life-changing opportunity |
| 📱 Soft-Life Influencer | Engagement | Post It | Engagement drops if you stop | Almost broke |
| 👑 Chief's Pikin | Family Influence | Daddy Will Handle It | Black tax | The money isn't theirs |
| 💃🏾 Owambe Aunty/Uncle | Gossip | Everybody Knows Me | FOMO | Knows everyone's secrets |

4. **Where you stay** — Yaba, Surulere, Lekki, Ikoyi, Ajah, or Gwarinpa, Wuse 2, Maitama, Asokoro, Kubwa. Each changes traffic, travel costs and clout.
5. **Live December** on the city map: travel by trek, danfo, okada or Bolt; 12 places per city; 4 time slots a day; Saturday owambes; diaspora arrivals; village trip; Christmas; Detty Fest concerts; crossover night.
6. **Secrets and people** — gist with people, investigate their stories, then **expose** them (clout now, trust later) or **keep their secret** (loyalty pays). This works with the characters in town *and* with real players. If your own secret meter fills up, you get exposed.

Stats: ⚡ Energy, 🍛 Belle, 🔥 Vibes, 📱 Clout, 🤝🏾 Reputation (different from clout), 🔗 Connections, 💰 Naira + Dollars with a daily exchange rate.

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
| `js/data.js` | Personas, traits, goals, styles, places, people, actions, events |
| `js/engine.js` | Game rules (DOM-free; runs in Node for tests) |
| `js/avatar3d.js` | Low-poly 3D characters (three.js r128, vendored in `js/vendor/`) |
| `js/avatar.js` | Flat SVG characters for map pins and lists |
| `js/map.js` | Lagos and Abuja city maps |
| `js/ui.js` | Screens, accounts, shared city |
| `api/*.js` | Vercel serverless API (signup, login, logout, me, save, city, interact, inbox) |
| `db/schema.sql` | Postgres schema (Neon) |

## Develop

```sh
npm install
npm test                    # 480 simulated Decembers + API tests on in-memory Postgres
node test/dev-server.js     # http://localhost:3000 with an in-memory database
```

Set `DATABASE_URL` to use a real Postgres instead. Apply the schema with `DATABASE_URL=... node db/migrate.js`.

## Deploy

Vercel project with the `DATABASE_URL` environment variable pointing at Neon. Functions run in London (`lhr1`) next to the database.
