# Training app
- [x] Implement individual Strava/Garmin connection logic, encrypted credentials, read-only OAuth, sync/reconnect/disconnect and cross-provider deduplication; 18 calculation tests passed, signed-out settings checked on desktop/mobile.
- [ ] Activate and verify Strava authorization/import (blocked: Strava Client ID/Secret setup declined; no signed-in athlete account; register the app origin hostname as Strava Authorization Callback Domain).
- [x] Add deep cycling, running and skiing analysis, indoor/outdoor comparison, sample-based curves and zones, and further analysis suggestions; tested calculations, FIT import and desktop/mobile sport navigation.
- [x] Fix remaining dashboard/data TypeScript errors and verify preview loads (build OK; 3 tests passed; dashboard, activities and settings checked).
- [ ] Verify private sign-in and saved profile with an authenticated user session (blocked: no auth users exist; create an account and sign in in the preview).
- [ ] Verify Garmin connection, sync and key replacement with the user's key (blocked: user's Garmin key needed).
- [x] Clean graph-led dashboard for sleep, recovery and activities, with detailed running/cycling sections (4 tests passed; desktop/mobile navigation checked).