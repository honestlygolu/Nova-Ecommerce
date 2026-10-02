# NOVA Full-Stack Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the approved customer-facing NOVA storefront with a FastAPI/PostgreSQL API, secure accounts, persistent shopping, and Razorpay test checkout.

**Architecture:** Preserve the existing Vite/React application and add a separately deployable FastAPI service. PostgreSQL is the source of truth for products, stock, accounts, carts, and orders; the frontend keeps only guest cart and wishlist state locally. Razorpay secrets stay on the server and paid status is set only after server verification.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, React Router, Axios, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, `pwdlib[argon2]`, PyJWT, SMTP/Mailpit, Razorpay Standard Checkout.

**Spec:** `docs/superpowers/specs/2026-10-02-nova-storefront.md`

## Global Constraints

- Keep the current frontend stack and preserve the uncommitted `frontend/src/App.jsx` and `frontend/src/pages/Login.jsx` edits.
- Require Python 3.12+, PostgreSQL, SQLAlchemy 2, and Alembic for the backend.
- Store money in integer paise and calculate all order totals from server-side product records; reserve inventory for pending orders and release it on cancellation/failure/expiry.
- Store passwords with Argon2id; keep JWT access sessions in HttpOnly cookies with 30-minute expiry, exact-origin CORS, and CSRF checks on mutations.
- Use only Razorpay test mode; verify checkout signatures and webhook signatures server-side before changing payment status.
- Include free shipping and inclusive prices; do not introduce tax calculations.
- Keep credentials out of version control and document each required environment variable.
- Do not add or run tests/builds unless the user asks to test or verify.

## Review Focus

- Invalid, expired, and cross-user auth sessions must not expose account carts or order history.
- A client-submitted price or quantity beyond stock must never change the server-calculated order amount.
- Duplicate payment callbacks/webhooks must not double-decrement stock or duplicate paid state.
- Missing SMTP or Razorpay credentials must produce explicit, safe UI states instead of fake success.
- Empty catalogs, empty carts, unavailable images, and mobile layouts must remain navigable and legible.

---

### Task 1: Backend foundation and catalog API

**Files:**
- Create: `backend/pyproject.toml`, `backend/.env.example`, `backend/app/main.py`
- Create: `backend/app/core/config.py`, `backend/app/db/session.py`, `backend/app/db/base.py`
- Create: `backend/app/models/product.py`, `backend/app/schemas/product.py`, `backend/app/api/routes/products.py`
- Create: `backend/alembic.ini`, `backend/alembic/env.py`, initial migration, and `backend/app/seed.py`
- Create: root `docker-compose.yml` for PostgreSQL and Mailpit
- Modify: root `README.md`

**Interfaces:**
- `GET /api/health` returns `{"status":"ok"}`.
- `GET /api/products?q=&category=&sort=&page=&page_size=` returns `{items, total, page, page_size}`; each item includes `id`, `name`, `category`, `description`, `pricePaise`, `originalPricePaise`, `discount`, `rating`, `image`, and `stock`.
- `GET /api/products/{id}` returns the same product shape or HTTP 404.
- `python -m app.seed` upserts the four existing NOVA products, adds concise product descriptions and starting stock, and does not create duplicates.

- [x] Add backend settings, SQLAlchemy engine/session, FastAPI app, health route, and local service configuration.
- [x] Add product schema/model, Alembic initial migration, catalog query filters/sorting/pagination, and deterministic seed data from the existing frontend catalog.
- [x] Add local setup instructions with migration and seed commands.

### Task 2: Secure account and recovery flow

**Files:**
- Create: `backend/app/models/user.py`, `backend/app/models/password_reset.py`
- Create: `backend/app/schemas/auth.py`, `backend/app/core/security.py`, `backend/app/services/email.py`
- Create: `backend/app/api/routes/auth.py`, auth migrations, and auth environment settings
- Create: `frontend/src/services/api.js`, `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/pages/Register.jsx`, `frontend/src/pages/ForgotPassword.jsx`, `frontend/src/pages/ResetPassword.jsx`, `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/pages/Login.jsx`, `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`

**Interfaces:**
- Auth routes and cookie/CSRF behavior follow the approved spec.
- Auth context exposes `{user, loading, csrfToken, register, login, logout, refreshUser}`.
- Axios sends credentials, obtains CSRF state, and includes the CSRF header on state-changing requests.

- [x] Add user/reset-token persistence, Argon2id hashing, JWT cookie lifecycle, CSRF and origin checks, and neutral password-reset responses.
- [x] Add SMTP delivery with Mailpit-compatible settings and one-use, expiring, hashed reset tokens.
- [x] Wire the existing lamp form, register/recovery routes, protected account route, and account navigation to the API.

### Task 3: Catalog, navigation, and saved items

**Files:**
- Create: `frontend/src/context/WishlistContext.jsx`, `frontend/src/pages/Wishlist.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/components/ProductCard.jsx`, `frontend/src/pages/Shop.jsx`, `frontend/src/pages/ProductDetails.jsx`, `frontend/src/index.css`

**Interfaces:**
- Catalog pages consume the Task 1 product API through `frontend/src/services/api.js`.
- Wishlist context exposes `{items, hasItem, toggleItem, removeItem, clearItems}` and persists guest saved IDs locally.
- Navbar search navigates to `/shop?q=...`; categories use `/shop?category=...`; all icon actions have accessible labels and functional destinations.

- [x] Replace hard-coded catalog reads with API-backed loading, search, category, sorting, pagination, and product details.
- [x] Add saved-item controls and wishlist route; make home/category/shop links and navbar actions work.
- [x] Add consistent loading, empty, error, and unavailable-image presentation without changing the lamp login interaction.

### Task 4: Persistent cart and account merge

**Files:**
- Create: `backend/app/models/cart_item.py`, `backend/app/schemas/cart.py`, `backend/app/api/routes/cart.py`, cart migration
- Modify: `frontend/src/context/CartContext.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/pages/Cart.jsx`, `frontend/src/services/api.js`, `frontend/src/context/AuthContext.jsx`

**Interfaces:**
- Cart routes are authenticated and return product snapshots plus authoritative `quantity` and `pricePaise`; `POST /api/cart/merge` clamps guest quantities to current stock and returns any adjustment notices.
- Cart context exposes current cart items, subtotal in paise, total quantity, add/increase/decrease/remove/clear operations, and guest-to-account merge.
- Cart quantity is always a positive integer no greater than server stock.

- [x] Add persistent account cart endpoints and server-side stock/quantity validation.
- [x] Preserve guest cart locally, merge on successful login/register, then use the account cart as source of truth.
- [x] Update cart totals and navbar badge to sum quantities; render clear stock and empty-cart states.

### Task 5: Checkout, payment, and order history

**Files:**
- Create: `backend/app/models/order.py`, `backend/app/models/order_item.py`, `backend/app/schemas/order.py`
- Create: `backend/app/services/orders.py`, `backend/app/services/razorpay.py`, `backend/app/api/routes/orders.py`, `backend/app/api/routes/payments.py`, order/payment migrations
- Create: `frontend/src/pages/Checkout.jsx`, `frontend/src/pages/OrderConfirmation.jsx`, `frontend/src/pages/Orders.jsx`, `frontend/src/pages/OrderDetails.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/pages/Cart.jsx`, `frontend/src/services/api.js`, `backend/.env.example`, root `README.md`

**Interfaces:**
- `POST /api/orders` accepts a validated shipping address and `Idempotency-Key`, binds the key to a server-computed cart/product-price/quantity/address fingerprint, creates or safely replays a pending order, and reserves available stock from the signed-in user's database cart; only one active checkout is allowed per account. Response includes internal order ID, Razorpay checkout fields, and saved item/address snapshots.
- `GET /api/orders/active` returns the signed-in user's unexpired pending checkout and saved snapshots, or `null`, so reloads can resume payment without opening a duplicate order.
- `POST /api/orders/{id}/verify` verifies the Razorpay signature against the stored provider order and updates status idempotently.
- `POST /api/orders/{id}/cancel` releases a pending checkout reservation when the customer dismisses Razorpay Checkout.
- A capture arriving after local cancellation/expiry triggers a full refund and moves the order to `refund_pending`/`refunded`; never fulfill a closed checkout. Refund failures move to `payment_review` and the confirmation and order pages explain the state.
- `POST /api/payments/razorpay/webhook` verifies `X-Razorpay-Signature`, records unique event IDs, and updates payment/order state idempotently.
- Order history/details are scoped to the authenticated owner and include immutable line-item snapshots, total paise, shipping address, and status.

- [x] Create orders transactionally with server-calculated total, free shipping, address snapshot, and Razorpay test order.
- [x] Add checkout UI and Razorpay Standard Checkout; handle cancellation/unconfigured keys without creating fake success.
- [x] Verify callback and webhook signatures, prevent duplicate state/stock changes, and add confirmation/history/detail routes.
- [x] Make checkout creation idempotent across retries and separate tabs; enforce one active payable order per account.
- [x] Add persistent account/IP-aware rate limits to registration, login, password recovery/reset, and checkout creation.

### Task 6: Finish navigation and deployment handoff

**Files:**
- Create: `backend/Dockerfile`, `frontend/vercel.json`, `frontend/.env.example`
- Modify: root `README.md`, `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, relevant page styles

**Interfaces:**
- Local development runs PostgreSQL/Mailpit, FastAPI, and Vite using documented commands.
- Deployment instructions identify Vercel build settings, backend container settings, PostgreSQL, same-site frontend/API domains, allowed frontend origin, and every required secret.
- Routes include home, shop, product detail, wishlist, cart, login, register, forgot/reset password, account, checkout, order confirmation, order history, and order detail, plus a useful not-found page.

- [x] Add backend container and Vercel rewrite/proxy configuration using a documented API host placeholder that the owner supplies at deployment time.
- [x] Complete responsive layout, footer/help links, navigation, route guards, and visible request/payment states across the full customer flow.
- [x] Document local setup, seeding, sandbox key setup, webhook setup, environment variables, and deployment handoff; leave live credentials and deployment actions to the owner.
