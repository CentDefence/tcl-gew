const { crypto, signed, putCookie, baseUrl, discordConfig, oauthRedirect } = require('../_lib');
module.exports = (req, res) => {
  try {
    const cfg = discordConfig(); const state = crypto.randomBytes(24).toString('base64url');
    putCookie(res, 'tcl_oauth_state', signed({ state, exp: Date.now() + 10 * 60 * 1000 }), 600);
    const u = new URL('https://discord.com/oauth2/authorize');
    u.search = new URLSearchParams({ client_id: cfg.id, response_type: 'code', redirect_uri: oauthRedirect(req), scope: 'identify guilds.join', state, prompt: 'consent' });
    res.writeHead(302, { Location: u.toString(), 'Cache-Control': 'no-store' }); res.end();
  } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(e.message); }
};
