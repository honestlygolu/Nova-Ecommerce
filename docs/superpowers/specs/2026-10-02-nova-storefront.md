# NOVA Full-Stack Storefront

## Goal

Turn the current NOVA React storefront into a polished, locally runnable, portfolio-quality customer shopping experience with real accounts, persistent data, and a Razorpay sandbox checkout.

## Approved direction

- Keep the existing React 19, Vite, Tailwind CSS v4, React Router, Axios, and lucide-react frontend.
- Add a Python 3.12+ FastAPI backend with PostgreSQL, SQLAlchemy 2, and Alembic migrations.
- Use Argon2id password hashes through `pwdlib[argon2]` and signed JWT access sessions in HttpOnly cookies. Access sessions expire after 30 minutes. Use exact-origin CORS, a CSRF token/header for state-changing requests, `Secure` cookies in production, and `SameSite=Lax`.
- Use Razorpay Standard Checkout in test mode. The server creates payment orders from its own product prices and verifies returned signatures before marking an order paid. Store amounts as integer paise.
- Preserve the user's current uncommitted edits to `frontend/src/App.jsx` and `frontend/src/pages/Login.jsx`.

## Customer experience

1. Visitors can browse the home page, navigate categories that have products, search, filter, sort, and open product details.
2. Product cards expose working add-to-cart and save-item actions. The wishlist has its own route and persists in the browser.
3. Guest carts persist locally. Signing in merges the guest cart into the account cart. Account carts persist in PostgreSQL and validate stock and price on the server.
4. Visitors can create an account, sign in, sign out, request a password reset, and set a new password. Reset messages use configured SMTP; local development uses Mailpit. Reset requests always return a neutral response.
5. Signed-in customers can submit a shipping address, pay through Razorpay test checkout, see an order confirmation, and revisit order history and details.
6. Every visible navigation or action control has a working destination or action, including navbar search, account, wishlist, and cart quantity badge.
7. Pages include clear loading, empty, validation, unavailable-payment, and request-error states, and remain usable on mobile and desktop.

## Commerce rules

- Seed the database from the four existing NOVA products in `frontend/src/data/products.js`; preserve their names, categories, image URLs, INR prices, and discounts, and add concise product descriptions.
- Store current and original prices as integer paise in PostgreSQL; return integer paise from the API and format INR in the frontend.
- Products have server-managed on-hand and reserved stock. Reserve stock transactionally when a pending order is created, report only unreserved units as available, release reservations on failed/cancelled/expired orders, and decrement on-hand stock only after a verified successful payment. Checkout creation requires an idempotency key bound to a server-computed fingerprint of the cart, product prices, quantities, and shipping address; only one active payable order is allowed per account.
- Shipping is free. Displayed prices include taxes; no tax calculation is introduced.
- Persist immutable product name, image, SKU, quantity, and unit-price snapshots on order items.
- Create pending orders and reserve stock on the server before opening Razorpay. A frontend callback alone never marks an order paid. Verify the provider signature on the server and accept signed, idempotent Razorpay webhook events for payment status updates.
- No merchant/admin dashboard, live charges, or real deployment is included. The product catalog is managed by the seed data/database for this portfolio scope.

## API contract

All routes use the `/api` prefix and JSON except the Razorpay hosted checkout.

- `GET /api/auth/csrf` issues a CSRF token for the active origin.
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password` implement the account flow with persistent account/IP-aware rate limits.
- `GET /api/products` accepts `q`, `category`, `sort`, and pagination parameters; `GET /api/products/{id}` returns one product.
- `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/{product_id}`, `DELETE /api/cart/items/{product_id}`, `DELETE /api/cart`, and `POST /api/cart/merge` implement the authenticated cart.
- `POST /api/orders` validates the account cart and shipping address, requires an `Idempotency-Key`, creates or safely replays a pending order and Razorpay order, and returns the public checkout fields plus saved item/address snapshots. Reusing a key with changed request details is rejected.
- `GET /api/orders/active` returns the signed-in user's unexpired pending checkout with its saved item/address snapshots, or `null`, so a page reload can resume the same Razorpay order.
- `POST /api/orders/{id}/cancel` releases a pending checkout reservation when Razorpay Checkout is dismissed before payment.
- If a captured payment arrives after local cancellation or expiry, request a full refund and move the order to `refund_pending` or `refunded`; never fulfill the closed order automatically. If the provider cannot confirm a refund, move the order to `payment_review` and tell the customer to wait for store-owner review before retrying.
- `POST /api/orders/{id}/verify` verifies the checkout result; `GET /api/orders` and `GET /api/orders/{id}` return the signed-in user's order history and details.
- `POST /api/payments/razorpay/webhook` validates the webhook signature and processes events idempotently.

## Local and deployment setup

- Provide `backend/.env.example` and `frontend/.env.example`; never commit secrets.
- Provide Docker Compose for PostgreSQL and Mailpit, Alembic migrations, a repeatable product seed command, and clear setup/run instructions in a root README.
- Provide backend container/deployment configuration and Vercel frontend configuration/instructions. Production auth uses a same-site frontend/API domain pair; configure the exact frontend origin, cookie security, database URL, JWT secret, SMTP, Razorpay test keys, and webhook secret through host environment variables.
- The app must show a clear setup message when Razorpay or SMTP credentials are absent; it must not simulate successful payment or password delivery.

## Design constraints

- Keep the existing lamp login interaction and current visual direction; wire its form to real auth and add matching account-flow pages.
- Reuse existing components and product imagery where sensible. Keep the NOVA visual system coherent across new pages.
- Do not add frontend or backend test suites, or run tests/build commands, unless the user explicitly asks for testing or verification.
