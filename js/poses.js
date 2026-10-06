// DECEMBER WAHALA — character poses and animation: walking, sitting, eating,
// lying in bed, dancing, praying, cooking, working out, chatting on the phone.
// Works on the joints Avatar3D builds (legs, knees, arms, elbows).
/* global THREE */
(function () {
  const SIT_Y = -0.66; // drops the hips onto a seat (characters are drawn at 1.7×)
  const LIE_Y = 1.0;
  const zero = (o) => { if (o) o.rotation.set(0, 0, 0); };

  // Sets the joints for a pose at animation phase ph. Returns the extra height
  // to add to the character's base position.
  function apply(model, pose, ph, opts = {}) {
    const L = model.userData.limbs;
    if (!L) return 0;
    const [ll, lr] = L.legs, [kl, kr] = L.knees || [], [al, ar] = L.arms, [el, er] = L.elbows || [];
    [ll, lr, kl, kr, al, ar, el, er].forEach(zero);
    model.rotation.x = 0;
    const sin = Math.sin(ph), s2 = Math.sin(ph * 2);
    let y = 0;
    const sit = () => {
      if (ll) { ll.rotation.x = -1.5; lr.rotation.x = -1.5; }
      if (kl) { kl.rotation.x = 1.45; kr.rotation.x = 1.45; }
      if (al) { al.rotation.x = -0.35; ar.rotation.x = -0.35; }
      if (el) { el.rotation.x = -0.8; er.rotation.x = -0.8; }
      y = SIT_Y;
    };
    switch (pose) {
      case "walk":
      case "run": {
        const k = pose === "run" ? 0.85 : 0.6;
        if (ll) { ll.rotation.x = sin * k; lr.rotation.x = -sin * k; }
        if (kl) { kl.rotation.x = Math.max(0, -sin) * k * 1.2; kr.rotation.x = Math.max(0, sin) * k * 1.2; }
        if (al) { al.rotation.x = -sin * k * 0.8; ar.rotation.x = sin * k * 0.8; }
        if (el) { el.rotation.x = -0.35; er.rotation.x = -0.35; }
        y = Math.abs(Math.sin(ph)) * 0.05;
        break;
      }
      case "sit": sit(); if (al) { al.rotation.z = -0.05 + Math.sin(ph * 0.3) * 0.03; } break;
      case "eat":
        sit();
        if (ar) { const up = (Math.sin(ph * 0.9) + 1) / 2; ar.rotation.x = -0.35 - up * 0.45; er.rotation.x = -0.9 - up * 1.4; }
        if (al) { al.rotation.x = -0.55; el.rotation.x = -0.9; }
        break;
      case "drink":
        if (opts.seated) sit();
        if (ar) { const up = Math.max(0, Math.sin(ph * 0.6)); ar.rotation.x = -0.3 - up * 0.5; er.rotation.x = -0.6 - up * 1.6; }
        break;
      case "lie":
        model.rotation.x = -Math.PI / 2;
        if (al) { al.rotation.z = -0.12; ar.rotation.z = 0.12; }
        y = LIE_Y + Math.sin(ph * 0.5) * 0.01;
        break;
      case "dance": {
        const b = Math.abs(Math.sin(ph));
        if (ll) { ll.rotation.x = Math.sin(ph) * 0.35; lr.rotation.x = -Math.sin(ph) * 0.35; ll.rotation.z = -0.08; lr.rotation.z = 0.08; }
        if (kl) { kl.rotation.x = 0.3 + b * 0.3; kr.rotation.x = 0.3 + (1 - b) * 0.3; }
        if (al) { al.rotation.x = -1.2 + Math.sin(ph) * 1.0; ar.rotation.x = -1.2 + Math.sin(ph + 1.6) * 1.0; al.rotation.z = -0.45; ar.rotation.z = 0.45; }
        if (el) { el.rotation.x = -0.6 - b * 0.6; er.rotation.x = -0.6 - (1 - b) * 0.6; }
        y = b * 0.12 - 0.05;
        break;
      }
      case "phone":
        if (opts.seated) sit();
        if (ar) { ar.rotation.x = -0.55; er.rotation.x = -1.95; ar.rotation.z = 0.15; }
        if (al && !opts.seated) { al.rotation.x = Math.sin(ph * 0.3) * 0.04; }
        break;
      case "pray":
        if (al) { al.rotation.x = -0.75; ar.rotation.x = -0.75; al.rotation.z = 0.32; ar.rotation.z = -0.32; }
        if (el) { el.rotation.x = -1.3; er.rotation.x = -1.3; }
        y = Math.sin(ph * 0.8) * 0.01;
        break;
      case "sing":
        if (al) { al.rotation.x = -1.1 + Math.sin(ph) * 0.15; ar.rotation.x = -1.1 + Math.sin(ph + 0.6) * 0.15; al.rotation.z = -0.55; ar.rotation.z = 0.55; }
        if (el) { el.rotation.x = -0.4; er.rotation.x = -0.4; }
        y = Math.abs(Math.sin(ph * 0.5)) * 0.03;
        break;
      case "workout": {
        if (ll) { ll.rotation.x = sin * 0.9; lr.rotation.x = -sin * 0.9; }
        if (kl) { kl.rotation.x = Math.max(0, -sin) * 1.3; kr.rotation.x = Math.max(0, sin) * 1.3; }
        if (al) { al.rotation.x = -sin * 0.9; ar.rotation.x = sin * 0.9; }
        if (el) { el.rotation.x = -1.4; er.rotation.x = -1.4; }
        y = Math.abs(sin) * 0.08;
        break;
      }
      case "cook":
        if (al) { al.rotation.x = -0.6; ar.rotation.x = -0.75; }
        if (el) { el.rotation.x = -0.9; er.rotation.x = -0.8 + Math.sin(ph * 2.2) * 0.35; }
        if (ar) ar.rotation.z = Math.sin(ph * 2.2) * 0.12;
        break;
      case "talk": {
        if (opts.seated) sit();
        const g1 = (Math.sin(ph * 0.8) + 1) / 2, g2 = (Math.sin(ph * 0.8 + 2) + 1) / 2;
        if (al && !opts.seated) { al.rotation.x = -0.25 - g1 * 0.4; ar.rotation.x = -0.25 - g2 * 0.45; al.rotation.z = -0.15 * g1; ar.rotation.z = 0.15 * g2; }
        if (el) { el.rotation.x = -0.6 - g1 * 0.6; er.rotation.x = -0.6 - g2 * 0.7; }
        break;
      }
      case "wave":
        if (ar) { ar.rotation.x = -0.4; ar.rotation.z = 2.6; er.rotation.x = -0.4 + Math.sin(ph * 3) * 0.4; }
        break;
      default: { // stand / idle: breathing and a little weight shift
        if (al) { al.rotation.x = Math.sin(ph * 0.5) * 0.03; ar.rotation.x = -Math.sin(ph * 0.5) * 0.03; al.rotation.z = -0.04; ar.rotation.z = 0.04; }
        if (el) { el.rotation.x = -0.12; er.rotation.x = -0.12; }
        y = Math.sin(ph * 0.5) * 0.006;
      }
    }
    return y;
  }

  // Which seat-pose an action uses while sitting (eat at tables, etc.).
  function seatedPose(actionPose, seatPose) {
    if (seatPose === "lie") return "lie";
    if (seatPose === "dance") return "dance";
    if (seatPose === "workout") return "workout";
    if (seatPose === "sing") return "sing";
    if (seatPose === "drink") return actionPose === "drink" ? "drink" : "talk";
    if (seatPose === "sit") return ["eat", "phone", "talk", "drink"].includes(actionPose) ? actionPose : "sit";
    return actionPose || "stand";
  }

  window.Poses = { apply, seatedPose, SIT_Y, LIE_Y };
})();
