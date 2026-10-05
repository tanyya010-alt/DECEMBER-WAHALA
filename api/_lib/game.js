// Game rules the server needs: validation, public persona, secrets, news text.
const D = require("../../js/data.js");

// The Wannabe IJGB shows up on the map as a "Real IJGB". That's the point.
const publicPersona = (p) => (p === "wannabe" ? "ijgb" : p);

const NEWS = {
  arrived: (u, s) => `🛬 @${u} just touched down in ${D.CITIES[s.city].name}`,
  vip: (u, s) => `🍾 @${u} just booked a VIP table at ${D.CITIES[s.city].places.lounge.name}`,
  concert: (u) => `🎤 @${u} is at the Detty Fest concert`,
  exposed: (u) => `😱 @${u}'s secret is out`,
  viral: (u) => `📈 @${u} is going viral`,
  bigbreak: (u) => `🚀 @${u} just landed a life-changing deal`,
  crossover: (u) => `🎆 @${u} crossed over into ${D.YEAR + 1}`,
  owambe: (u) => `👑 @${u} shut down an owambe`,
};

function validState(st) {
  if (!st || typeof st !== "object") return "Missing game state.";
  if (!D.CITIES[st.city]) return "Unknown city.";
  if (!D.AREAS[st.city][st.area]) return "Unknown area.";
  if (st.place !== "home" && !D.CITIES[st.city].places[st.place]) return "Unknown place.";
  if (!D.PERSONAS[st.persona]) return "Unknown persona.";
  if (!Number.isInteger(st.day) || st.day < 1 || st.day > 32) return "Bad day.";
  if (!st.look || typeof st.look !== "object" || !D.STYLES[st.look.style]) return "Bad look.";
  return null;
}

// Only the fields a stranger can see on the map.
function publicLook(look) {
  const keep = ["body", "skin", "hair", "hairColour", "style", "colour", "fabric", "shades", "chain", "gele", "beard"];
  return Object.fromEntries(keep.filter((k) => k in look).map((k) => [k, look[k]]));
}

const USERNAME = /^[a-z0-9_]{3,20}$/;

module.exports = { D, publicPersona, NEWS, validState, publicLook, USERNAME };
