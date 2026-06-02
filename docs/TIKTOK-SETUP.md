# TikTok — Go-Live Checklist

Code is built + committed; the reusable social framework powers it (Instagram/
Facebook/YouTube will reuse it). TikTok needs its own developer app (like GBP needed
allowlisting). READ-ONLY usage throughout.

## 1. Create a TikTok developer app
1. Go to **https://developers.tiktok.com/** → log in → **Manage apps → Connect an app** (create).
2. Add the **Login Kit** product.
3. **Scopes:** request `user.info.basic`, `user.info.stats`, `video.list`.
   (`video.list` may require submitting the app for review — approval can take days.)
4. **Redirect URI** — add exactly:
   ```
   https://us-central1-content-os-wheelrush.cloudfunctions.net/socialOAuthCallback
   ```
5. Copy the **Client key** and **Client secret**.

## 2. Set the 2 secrets (your terminal, or I can pull from your clipboard)
```bash
firebase functions:secrets:set TIKTOK_CLIENT_KEY
firebase functions:secrets:set TIKTOK_CLIENT_SECRET
```

## 3. I deploy the functions + make them public
```bash
firebase deploy --only functions:socialAuthUrl,functions:socialOAuthCallback,functions:socialSync,functions:socialDisconnect
```
…then set the 4 Cloud Run services (socialauthurl/socialoauthcallback/socialsync/
socialdisconnect) to "Allow public access" (auth still enforced via assertMember) — same as SC/GBP.

## 4. Connect + verify
Director → **🎵 TikTok** → **Connect TikTok** → consent → connected → auto-sync →
real views/likes/comments/shares + intelligence + content engine + revenue cross-ref.

## What you get vs what TikTok's API withholds
- **Available (Display API):** video views, likes, comments, shares, follower count,
  duration, captions, post time → powers top videos/hooks/cities/services, best posting
  times + lengths, engagement trend, the content engine, and the revenue cross-ref.
- **Not available (need TikTok Business/Research API):** reach, favorites, profile
  visits, average watch time, completion rate, followers-gained-over-time. Shown as
  "not available," never faked.

## Reusing this for Instagram / Facebook / YouTube
Add a connector in `functions/src/social/` (authUrl/exchange/refresh/sync → SocialData),
register it, add its secrets, and render `<TikTokIntelligence/>`-style with the new
platform id. Everything else (OAuth, storage, intelligence, content engine, revenue
cross-ref, UI) is already shared.
