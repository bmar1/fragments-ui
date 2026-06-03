# fragments-ui

React test UI for the Fragments API. Uses Amazon Cognito Hosted UI (OAuth2 + PKCE) and calls the `fragments` microservice.

## Setup

```bash
cd fragments-ui
npm install
cp .env.example .env
```

Edit `.env`:

- `REACT_APP_FRAGMENTS_API_URL` — API base URL (`http://localhost:8080` or your EC2 URL)
- Cognito `REACT_APP_*` variables (see `.env.example`)

## Run

```bash
npm start
```

Open http://localhost:3000, sign in with Cognito, create a **text/plain** fragment, and use DevTools Network to inspect the `POST` response (`Location` header + JSON body).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server (port 3000) |
| `npm test` | Jest + React Testing Library |
| `npm run build` | Production build |
