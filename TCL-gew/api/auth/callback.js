const { cookies, readSigned, putCookie, discordToken, discordApi, oauthRedirect, setSession, baseUrl, joinDiscord } = require('../_lib');
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, baseUrl(req)); const state = u.searchParams.get('state');
    const saved = readSigned(cookies(req).tcl_oauth_state);
    putCookie(res, 'tcl_oauth_state', '', 0);
    if (!saved || saved.exp < Date.now() || saved.state !== state || !u.searchParams.get('code')) throw new Error('Discord authorization was not completed. Please try again.');
    const token = await discordToken(u.searchParams.get('code'), oauthRedirect(req));
    const user = await discordApi('/users/@me', token.access_token);
    const membership = await joinDiscord(user.id, token.access_token).catch(() => ({ synced: false, reason: 'bot_sync_failed' }));
    setSession(res, { discord: { id: user.id, username: user.global_name || user.username, discriminator: user.discriminator, avatar: user.avatar, botSynced: membership.synced }, roblox: null, createdAt: Date.now() });
    res.writeHead(302, { Location: `${baseUrl(req)}/?linked=discord`, 'Cache-Control': 'no-store' }); res.end();
  } catch (e) { res.writeHead(302, { Location: `${baseUrl(req)}/?error=${encodeURIComponent(e.message)}`, 'Cache-Control': 'no-store' }); res.end(); }
};
