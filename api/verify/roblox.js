const { crypto, getSession, setSession, json, body } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
  const session = getSession(req); if (!session?.discord) return json(res, 401, { error: 'Please connect Discord first.' });
  try {
    const { username } = await body(req); const clean = String(username || '').trim();
    if (!/^[\w]{3,20}$/.test(clean)) return json(res, 400, { error: 'Enter a valid Roblox username (3–20 characters).' });
    const code = `TCL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    session.pendingRoblox = { username: clean, code, expiresAt: Date.now() + 15 * 60 * 1000 };
    setSession(res, session); return json(res, 200, { username: clean, code, expiresIn: 900 });
  } catch (e) { return json(res, 400, { error: e.message }); }
};
