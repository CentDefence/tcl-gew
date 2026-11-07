# TCL account linking on Vercel

The site stays a static archive. Vercel serves the included `/api` functions for Discord sign-in, signed sessions, Roblox description verification, and optional Discord guild syncing.

## 1. Create the Discord application

In the Discord Developer Portal, create an application and add this OAuth2 redirect URL (replace the domain with the deployed Vercel domain):

`https://YOUR-DOMAIN/api/auth/callback`

Copy its Client ID and Client Secret into Vercel project environment variables. The sign-in requests the `identify` and `guilds.join` scopes. The website never requests a Discord password.

## 2. Optional verification bot

Create a bot under the same Discord application and add it to your TCL server with the `bot` scope. Give it **Create Invite**, **Manage Nicknames**, and **Manage Roles** permissions, and move its role above the role it will assign. Discord requires Create Invite for the API flow that adds a consenting user to the server. `guilds.join` lets the site add the consenting user to the configured server during account verification.

Create a dedicated verified role and set its ID. The bot adds this role while preserving the member's existing roles, and sets their server nickname to the verified Roblox username. If bot settings are omitted, account linking still works, but Discord server syncing is skipped.

## 3. Deploy

Import this folder as a Vercel project (or deploy it with the Vercel CLI) using the default settings. Add these environment variables in Vercel, then redeploy:

| Variable | Required | Value |
| --- | --- | --- |
| `APP_URL` | Yes | Deployed origin, such as `https://tcl-gew.vercel.app` |
| `SESSION_SECRET` | Yes | A long random secret, at least 32 characters |
| `DISCORD_CLIENT_ID` | Yes | Application client ID |
| `DISCORD_CLIENT_SECRET` | Yes | Application client secret |
| `DISCORD_GUILD_ID` | Bot sync | TCL Discord server ID |
| `DISCORD_BOT_TOKEN` | Bot sync | Bot token; keep it only in Vercel environment variables |
| `DISCORD_VERIFIED_ROLE_ID` | Bot sync | ID of the verified role |

`APP_URL` must match the origin used by the Discord redirect URL. Never commit real secrets to this project or put them in browser code.

## Verification flow

1. The visitor signs into Discord through Discord's OAuth page.
2. The visitor enters a Roblox username. The site generates a one-time `TCL-XXXXXXXX` code.
3. The visitor adds the code to the About/description field of the Roblox profile and presses **I've added the code — verify**.
4. The server looks up that username with Roblox's public Users API and checks the returned public description for the exact code. The challenge expires after 15 minutes.
5. The site stores a signed, HTTP-only session cookie. If bot configuration is present, the server also joins the user to the configured Discord server and applies the nickname/verified role.

Roblox verification reads only publicly available profile data. The code can be removed from the Roblox description after verification; the stored session records the successful check. The current deployment stores the account link in the browser's signed cookie, so it is not a cross-device player database. A shared profile directory would need a persistent database such as Vercel Postgres or Redis.
