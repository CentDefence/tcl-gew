const { getSession, json, clearSession } = require('./_lib');
module.exports = (req, res) => {
  if (req.method === 'DELETE') { clearSession(res); return json(res, 200, { ok: true }); }
  const session = getSession(req);
  if (!session) return json(res, 200, { authenticated: false });
  const d = session.discord;
  return json(res, 200, { authenticated: !!d, discord: d ? { id: d.id, username: d.username, avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png` : null, botSynced: !!d.botSynced } : null, roblox: session.roblox || null, pendingRoblox: session.pendingRoblox ? { username: session.pendingRoblox.username, expiresAt: session.pendingRoblox.expiresAt, code: session.pendingRoblox.code } : null });
};
