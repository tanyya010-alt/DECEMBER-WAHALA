const { route, send } = require("./_lib/http");
const { endSession } = require("./_lib/auth");

module.exports = route({
  async POST({ req, res }) {
    await endSession(req, res);
    send(res, 200, { ok: true });
  },
});
