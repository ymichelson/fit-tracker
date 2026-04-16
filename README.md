# Forma Workout Tracker

A premium mobile-first workout tracker built with plain HTML, CSS, and JavaScript.

## Run locally

```bash
npm run serve
```

The server prints:

- `Open on this Mac: ...`
- `Open on your phone: ...`

## Install on phone

Once deployed or opened over your local network:

- iPhone Safari: Share -> Add to Home Screen
- Android Chrome: Menu -> Install app / Add to Home screen

## Deploy to GitHub Pages

This repo already includes a GitHub Pages workflow at `.github/workflows/pages.yml`.

After this folder is pushed to a GitHub repository:

1. Open the repository on GitHub
2. Go to `Settings` -> `Pages`
3. Under `Build and deployment`, set `Source` to `GitHub Actions`
4. Push to `main`

GitHub will publish the site automatically.

## Data note

Workout history is stored in the browser with `localStorage`, so each device keeps its own history.
