const { getSession, setSession, json, syncDiscord } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
  const session = getSession(req); const pending = session?.pendingRoblox;
  if (!session?.discord || !pending) return json(res, 400, { error: 'Please request a verification code first.' });
  if (pending.expiresAt < Date.now()) return json(res, 400, { error: 'This code has expired. Please get a new one.' });
  try {
    const search = await fetch('https://users.roblox.com/v1/usernames/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usernames: [pending.username], excludeBannedUsers: false }) });
    if (!search.ok) throw new Error('Roblox is not responding right now. Please try again later.');
    const results = await search.json(); const found = results.data?.find(x => x.requestedUsername.toLowerCase() === pending.username.toLowerCase());
    if (!found) return json(res, 404, { error: 'That Roblox username could not be found.' });
    const profileRes = await fetch(`https://users.roblox.com/v1/users/${found.id}`); if (!profileRes.ok) throw new Error('Could not read the Roblox profile.');
    const profile = await profileRes.json();
    if (!String(profile.description || '').includes(pending.code)) return json(res, 400, { error: 'The code was not found in the Roblox profile description. Add it and try again.' });
    const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${found.id}&size=150x150&format=Png&isCircular=false`);
    const avatars = avatarRes.ok ? await avatarRes.json() : null;
    session.roblox = { id: found.id, username: found.name, displayName: found.displayName, avatar: avatars?.data?.[0]?.imageUrl || null, verifiedAt: Date.now() };
    delete session.pendingRoblox; const bot = await syncDiscord(session); session.discord.botSynced = bot.synced;
    setSession(res, session); return json(res, 200, { ok: true, profile: { discord: { username: session.discord.username, avatar: session.discord.avatar ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.png` : null }, roblox: session.roblox }, bot });
  } catch (e) { return json(res, 502, { error: e.message }); }
};
