# Deployment 1 Month Test

This project is prepared for a 1 month test deployment with:

- web frontend on Vercel Hobby
- backend and PostgreSQL on Render Free
- Android APK distribution through Firebase App Distribution

## 1. Backend and database on Render

The repository includes a ready blueprint:

- [render.yaml](/Users/flapaabid/Downloads/stock-field-service/render.yaml)

It creates:

- one free PostgreSQL database
- one free backend web service

Backend scripts used by Render:

- [render-build.sh](/Users/flapaabid/Downloads/stock-field-service/backend/scripts/render-build.sh)
- [render-start.sh](/Users/flapaabid/Downloads/stock-field-service/backend/scripts/render-start.sh)

### Render steps

1. Push the repository to GitHub.
2. In Render, create a new Blueprint deployment from the repository.
3. Let Render create the database and backend service from `render.yaml`.
4. After the first deploy, open the backend service and set:

`APP_URL`
: your Vercel production URL, for example `https://stock-field-service.vercel.app`

`ALLOWED_ORIGINS`
: the same URL as `APP_URL`

`API_URL`
: your backend Render URL, for example `https://stock-field-backend.onrender.com`

`COMPANY_LOGO_URL`
: optional public logo URL used by the backend

5. Redeploy the backend once those variables are saved.

### Notes

- The backend health check is `GET /api/health`
- Render free services can sleep after inactivity
- Free Render PostgreSQL is suitable for a short test phase only

## 2. Web on Vercel

Deploy only the `web` directory.

### Vercel settings

Framework:
`Next.js`

Root Directory:
`web`

Environment variable:

`NEXT_PUBLIC_API_URL`
: `https://YOUR-RENDER-BACKEND.onrender.com/api`

### Vercel steps

1. Import the GitHub repository into Vercel.
2. Set the root directory to `web`.
3. Add `NEXT_PUBLIC_API_URL`.
4. Deploy.
5. Copy the final Vercel production URL and put it back into Render as `APP_URL` and `ALLOWED_ORIGINS`.

## 3. Android test build

Android package name is now:

`com.sacoges.stockfieldservicemobile`

File:
- [build.gradle.kts](/Users/flapaabid/Downloads/stock-field-service/mobile/android/app/build.gradle.kts)

The mobile app supports a deployment backend URL through `--dart-define`.

### Build APK

From the `mobile` folder:

```bash
flutter build apk --release --dart-define=API_ORIGIN=https://YOUR-RENDER-BACKEND.onrender.com
```

Generated file:

`mobile/build/app/outputs/flutter-apk/app-release.apk`

## 4. Firebase App Distribution

Use Firebase App Distribution for the Android test month.

### Prerequisites

1. Create a Firebase project.
2. Register an Android app with package name:
   `com.sacoges.stockfieldservicemobile`
3. Install Firebase CLI if needed.
4. Create a tester group or tester emails.

### Distribute APK

```bash
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups testers
```

You can also use individual emails:

```bash
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --testers email1@example.com,email2@example.com
```

## 5. Recommended production test URLs

Example:

- web: `https://stock-field-service.vercel.app`
- backend: `https://stock-field-backend.onrender.com`

Then use:

`NEXT_PUBLIC_API_URL=https://stock-field-backend.onrender.com/api`

`APP_URL=https://stock-field-service.vercel.app`

`ALLOWED_ORIGINS=https://stock-field-service.vercel.app`

`API_URL=https://stock-field-backend.onrender.com`

## 6. What is already prepared in code

- backend CORS now supports `APP_URL` and comma-separated `ALLOWED_ORIGINS`
- mobile supports `--dart-define=API_ORIGIN=...`
- Android package name is no longer the default example package

## 7. What still needs your account access

These steps cannot be completed automatically without your accounts:

- Render account creation/linking
- Vercel project import
- Firebase project creation
- Firebase App Distribution app registration
- Google/Firebase credentials and tester list
