# Feature Comparison: Our Platform vs EntryEeze vs SportsEngine

Last updated: 2026-05-19

| Feature | EntryEeze | SportsEngine | Our Platform |
|---|---|---|---|
| **Membership** | | | |
| New member registration | ✅ | ❌ | ✅ |
| Family registration (multi-skater) | ✅ | ❌ | ✅ |
| Membership renewal flow | ✅ | ❌ | ✅ |
| Auto-expire on July 1 | ✅ | ❌ | ✅ Celery Beat daily |
| Renewal reminder emails | ✅ | ❌ | ✅ built · needs SMTP |
| Membership types on/off shelf | ✅ | ❌ | ✅ `is_active` flag |
| Skating vs non-skating flag | ✅ | ❌ | ✅ `is_skating` flag |
| Digital waiver w/ signature | ✅ | ❌ | ✅ |
| USFS CSV export | ✅ | ❌ | ✅ |
| Member card | ✅ | ❌ | ✅ |
| **Payments** | | | |
| Online payments (credit card) | ✅ 2.2%+$0.30 | ✅ | ⚠️ Stripe built · needs keys |
| Convenience fee config | ✅ | ❌ | ❌ |
| Late fee | ✅ | ❌ | ❌ |
| Payment history | ✅ | ✅ | ✅ |
| **Ice / Scheduling** | | | |
| Contract ice / punch cards | ✅ | ❌ | ✅ |
| Test session booking | ✅ | ❌ | ✅ |
| Members-only ice gating | ✅ | ❌ | ⚠️ flag exists · not enforced yet |
| Lesson/class booking | ✅ | ✅ | ✅ |
| **Coach / Admin** | | | |
| Coach portal | ❌ | ❌ | ✅ |
| Admin dashboard | ✅ basic | ✅ basic | ✅ |
| Competition entry | ✅ | ❌ | ✅ |
| Skater-Stats integration | ❌ | ❌ | ✅ |
| **Communication** | | | |
| Email blast to members | ✅ | ✅ | ✅ built · needs SMTP |
| Push notifications | ❌ | ✅ app | ✅ PWA built · needs VAPID keys |
| **Other** | | | |
| Mobile app | ❌ | ✅ | ✅ PWA |
| Donations module | ✅ | ✅ | ❌ |
| HTTPS / real domain | ❌ | ✅ | ❌ Tailscale only |

## Remaining gaps before fully replacing EntryEeze

1. **Stripe keys** — one `.env` update, ~30 min
2. **Gmail SMTP** — 5 env vars + backend rebuild (waiting on app password)
3. **Cloudflare Tunnel** — needed for HTTPS + iOS password save
4. **Members-only ice gating** — enforce `is_skating` check on lesson/test session booking
5. **Donations** — low priority, can link externally for now
