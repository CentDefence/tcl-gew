const crypto = require('node:crypto');

const cookieName = 'tcl_session';
const secret = process.env.SESSION_SECRET;
function signed(value) {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function readSigned(value) {
  if (!secret || !value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  let actual;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('='); return [x.slice(0, i), decodeURIComponent(x.slice(i + 1))];
  }));
}
function putCookie(res, name, value, maxAge = 60 * 60 * 24 * 14) {
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
function getSession(req) { return readSigned(cookies(req)[cookieName]); }
function setSession(res, value) { putCookie(res, cookieName, signed(value)); }
function clearSession(res) { putCookie(res, cookieName, '', 0); }
function json(res, status, value) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value)); }
function body(req) { return new Promise((resolve, reject) => { let s=''; req.on('data', c => { s += c; if (s.length > 8000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function baseUrl(req) { return process.env.APP_URL || `https://${req.headers.host}`; }
function discordConfig() {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) throw new Error('Discord OAuth environment variables are missing');
  return { id: DISCORD_CLIENT_ID, secret: DISCORD_CLIENT_SECRET };
}
function oauthRedirect(req) { return `${baseUrl(req)}/api/auth/callback`; }
async function discordToken(code, redirect_uri) {
  const cfg = discordConfig();
  const form = new URLSearchParams({ client_id: cfg.id, client_secret: cfg.secret, grant_type: 'authorization_code', code, redirect_uri });
  const r = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const data = await r.json(); if (!r.ok) throw new Error(data.error_description || 'Discord OAuth failed'); return data;
}
async function discordApi(path, token) {
  const r = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json(); if (!r.ok) throw new Error(data.message || 'Discord API failed'); return data;
}
async function joinDiscord(userId, accessToken) {
  const guild = process.env.DISCORD_GUILD_ID, botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guild || !botToken) return { synced: false, reason: 'bot_not_configured' };
  const memberUrl = `https://discord.com/api/v10/guilds/${guild}/members/${userId}`;
  const add = await fetch(memberUrl, { method: 'PUT', headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: accessToken }) });
  if (!add.ok && add.status !== 204) {
    const err = await add.json().catch(() => ({})); return { synced: false, reason: err.message || 'bot_cannot_join_guild' };
  }
  return { synced: true };
}
async function syncDiscord(session) {
  const guild = process.env.DISCORD_GUILD_ID, botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guild || !botToken) return { synced: false, reason: 'bot_not_configured' };
  const headers = { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' };
  const memberUrl = `https://discord.com/api/v10/guilds/${guild}/members/${session.discord.id}`;
  const update = { nick: session.roblox.username };
  if (process.env.DISCORD_VERIFIED_ROLE_ID) {
    const current = await fetch(memberUrl, { headers: { Authorization: `Bot ${botToken}` } });
    const member = current.ok ? await current.json() : null;
    update.roles = [...new Set([...(member?.roles || []), process.env.DISCORD_VERIFIED_ROLE_ID])];
  }
  const edit = await fetch(memberUrl, { method: 'PATCH', headers, body: JSON.stringify(update) });
  return { synced: edit.ok, reason: edit.ok ? undefined : (await edit.json().catch(() => ({}))).message || 'member_update_failed' };
}
module.exports = { crypto, cookieName, signed, readSigned, cookies, putCookie, getSession, setSession, clearSession, json, body, baseUrl, discordConfig, oauthRedirect, discordToken, discordApi, joinDiscord, syncDiscord };
