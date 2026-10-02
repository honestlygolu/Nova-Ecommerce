# NOVA Store

NOVA is a portfolio ecommerce storefront with a React/Vite customer site and a FastAPI/PostgreSQL API. It includes product browsing, saved items, guest and account carts, password recovery, order history, and Razorpay test checkout. The checkout is sandbox-only and does not take real payments.

## Run locally

Requirements: Python 3.12+, Node.js 22+, and Docker Desktop.

Start PostgreSQL and Mailpit from the project root:

```bash
docker compose up -d
```

Mailpit captures recovery emails at `http://localhost:8025`.

In one terminal, configure and start the API:

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The API docs are at `http://localhost:8000/docs`; health is at `http://localhost:8000/api/health`.

In a second terminal, start the storefront:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` calls to the local API. The seed command adds the four portfolio products once; rerunning it refreshes product descriptions and imagery without resetting stock.

## Sandbox setup

- Browsing, saved items, guest carts, and account carts work without payment keys.
- Password recovery requires an SMTP host. The local Compose setup sends messages to Mailpit.
- Registration, login, recovery, reset, and checkout requests use database-backed rate limits; recovery email delivery runs after the neutral response is returned.
- Checkout locks the item and address snapshot for an open order. If the page reloads, the same unexpired Razorpay checkout is restored. Closing checkout in NOVA cannot close a Razorpay payment window already open in another tab, so a late captured payment triggers an automatic full refund. If the provider cannot confirm that refund, the order is held for manual review instead of being fulfilled.
- Checkout requires Razorpay test mode credentials in `backend/.env`. `RAZORPAY_KEY_ID` must start with `rzp_test_`; the API rejects live keys.
- Never place provider secrets in frontend variables or commit `.env` files.

## Deploy the API

1. Create a managed PostgreSQL database and an API service that supports the included `backend/Dockerfile` (or deploy the backend directory as a Python 3.12 service).
2. Set the backend root to `backend` when the host asks for a service root directory. The container listens on `$PORT` (8000 by default).
3. Configure the environment variables below. Use a PostgreSQL URL with the `postgresql+psycopg://` driver.
4. Run `alembic upgrade head` as the host's release/pre-deploy command, then start the web process with `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (the Dockerfile starts Uvicorn on its own).
5. Seed the catalog once for a new database with `python -m app.seed` from the backend directory.

## Deploy the frontend

1. Import the repository into Vercel and set the project root to `frontend`.
2. Use `npm install`, `npm run build`, and `dist` as the install, build, and output settings.
3. Replace `YOUR_API_HOST` in `frontend/vercel.json` with the API's public hostname, such as `nova-api.example.com`. Keep the `https://` scheme and `/api` path. This makes API requests appear under the storefront's origin so the session cookie works across the customer site.
4. Set `VITE_API_BASE_URL=/api` in Vercel's environment. Set the backend `FRONTEND_ORIGINS` and `FRONTEND_URL` to the exact public storefront origin, such as `https://nova.example.com`.
5. Use HTTPS on the storefront and API. The API sets secure, HttpOnly session cookies in production.

If the API is hosted directly on a separate subdomain instead of routed through the Vercel `/api` rewrite, set `VITE_API_BASE_URL` to that API's `/api` URL and allow the exact storefront origin in `FRONTEND_ORIGINS`. Keep both hosts under the same registrable domain for `SameSite=Lax` cookies.

## Backend environment

`backend/.env.example` lists every setting. Configure these in the API host's secret/environment panel:

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | Required. Set to `production` to require strong secrets and secure cookies. |
| `DATABASE_URL` | PostgreSQL connection URL using `postgresql+psycopg://`. |
| `FRONTEND_ORIGINS` | Comma-separated exact storefront origins allowed by CORS and CSRF checks. |
| `FRONTEND_URL` | Public storefront origin used to build password-reset links. |
| `TRUSTED_PROXY_COUNT` | Number of trusted reverse proxies that append to `X-Forwarded-For`; defaults to `0` (use the direct peer address). |
| `JWT_SECRET` | Unique random secret, at least 32 characters. |
| `JWT_EXPIRE_MINUTES` | Session lifetime; defaults to 30 minutes. |
| `CSRF_SECRET` | Separate unique random secret, at least 32 characters. |
| `COOKIE_SECURE` | Set `true` for HTTPS; production always enables it. |
| `SMTP_HOST`, `SMTP_PORT` | SMTP host/port for account recovery. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Optional SMTP authentication credentials. |
| `SMTP_FROM` | Sender address accepted by the mail service. |
| `SMTP_USE_TLS` | Enable STARTTLS when required by the mail service. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay test mode credentials; live keys are refused. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured for the Razorpay webhook endpoint. |

Set `APP_ENV` explicitly. Generate different random values for `JWT_SECRET` and `CSRF_SECRET`; do not reuse the local example strings. The API refuses to start without an explicit environment or production-grade signing secrets.

Account rate limits apply across client IPs; a separate IP budget uses the direct peer by default. Set `TRUSTED_PROXY_COUNT` only when the API is reachable through a known proxy chain that appends the real client address to `X-Forwarded-For`, and restrict direct access to the API origin so callers cannot spoof that header.

## Razorpay webhook

In the Razorpay test dashboard, create a webhook pointing to `https://YOUR_STOREFRONT_HOST/api/payments/razorpay/webhook` (or the API host's equivalent `/api/payments/razorpay/webhook` URL). Use the exact same webhook secret in `RAZORPAY_WEBHOOK_SECRET` and subscribe to `payment.captured`, `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`. Keep the Razorpay key pair in test mode. Order totals and stock changes are calculated and checked by the API.

## Project layout

- `frontend/` — React/Vite storefront and Vercel rewrite.
- `backend/` — FastAPI API, SQLAlchemy models, Alembic migrations, and container definition.
- `docker-compose.yml` — local PostgreSQL and Mailpit services.
- `docs/superpowers/` — approved product spec and implementation plan.
