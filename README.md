# 🎄 DECEMBER WAHALA: A Naija Detty Christmas Simulation

A life-sim game about surviving and enjoying **Detty December** in **Lagos** or **Abuja**. Friends and family fly in from abroad, owambes happen every Saturday, NEPA takes light, and the dollar rate moves every morning.

## Play

It's a static site with no build step:

- Open `index.html` in a browser, or
- Run `npm start` and visit the URL it prints, or
- Deploy the folder to any static host (Vercel, Netlify, GitHub Pages).

Progress saves automatically in your browser.

## The game

- **Create your Naija Sim:** pick a name, a look, a city (Lagos 🌉 or Abuja 🏛️) and a background:
  - 🧳 **IJGB Returnee:** dollars in pocket, no street sense.
  - 💪 **Local Hustler:** street smart, broke.
  - 👑 **Chief's Pikin:** money plus heavy family expectations.
- **31 days × 4 time slots:** Morning, Afternoon, Evening and Night. Most activities take one slot.
- **Sims-style needs:** ⚡ Energy, 🍛 Belle, 🎉 Vibes, 💬 Social and 🧘 Peace of Mind. A plumbob and moodlets show how you're doing.
- **9 places per city:** home, market, mall (BDC), lounges, beach/park, church, hustle spot, airport and the concert grounds. Each has its own activities.
- **Getting around:** danfo, okada, Bolt, or trekking for free. Lagos traffic is real.
- **Diaspora arrivals:** Cousin Tobi 🇬🇧, Aunty Funke 🇺🇸 and Chidi 🇨🇦 land on set days. Pick them up at the airport or face the consequences.
- **Calendar events:** Saturday owambes (bring your aso-ebi), the village trip on Christmas Eve, Christmas lunch, Detty Fest concerts and **Crossover Night**.
- **Random wahala:** NEPA, black tax, "when are you getting married?", checkpoints, fuel scarcity, jollof wars, agberos, phone snatchers, going viral.
- **Money:** Naira, Dollars and a daily FX rate. Hustle at Computer Village / Banex for extra cash.
- **Ending:** your score comes from memories, family respect, clout, relationships, mood, money and achievements. It earns you a title from *Wahala Magnet* up to *Detty December Legend*.

## Code

| File | Purpose |
| --- | --- |
| `js/data.js` | Cities, roles, people, actions, random events, achievements |
| `js/engine.js` | Game rules (DOM-free, also runs in Node) |
| `js/ui.js` | Browser rendering and input |
| `test/simulate.js` | Plays 400 random Decembers headlessly to catch crashes and stuck states |

Run the tests with `npm test`.
