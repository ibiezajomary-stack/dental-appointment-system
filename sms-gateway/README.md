# iSmile SMS Gateway

Expo Android app that fetches queued appointment SMS from the Dental Appointment System API and sends them from this phone.

The app is **Android-only** for silent sending (`SmsManager`). Expo Go cannot do that, so install the local preview APK on a phone with a SIM.

## Preview APK (sideload)

After dependencies are installed:

```bash
cd sms-gateway
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run apk
```

That writes:

- `android/app/build/outputs/apk/release/app-release.apk`
- `iSmile-sms-gateway-preview.apk` (same file, easier to find)

USB install when a phone is plugged in:

```bash
npm run apk:install
```

## Configure

1. **API URL** — your deployed server, e.g. `https://your-app.onrender.com`, or a LAN IP for local testing (`http://192.168.x.x:4000`).
2. **Gateway secret** — `SMS_GATEWAY_SECRET` from `server/.env` (or the Render env var).
3. Allow **SMS** when Android asks.
4. Turn on **Auto-send**, or tap **Send due SMS now**.

Confirming an appointment on the web app queues:

- an “accepted” SMS due immediately
- a reminder due 24 hours before the visit

The app sends due items, then marks them sent on the server so they are not sent twice.
