# Braintree Demo with Trustly & FXaaS

A small Express demo app showing a Braintree checkout flow: an
order selection page, a payment page (Credit/Debit Card, Apple Pay, Google
Pay, Trustly), and a review page showing the transaction result.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Braintree Sandbox](https://www.braintreegateway.com/) account, with API
  keys and at least one merchant account ID (MAID) per currency you want to
  test

## Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd "BT - Iris Demo"
   npm install
   ```

2. Create a `.env` file in the project root with your Braintree Sandbox
   credentials:

   ```
   BT_MERCHANT_ID=your_merchant_id
   BT_PUBLIC_KEY=your_public_key
   BT_PRIVATE_KEY=your_private_key
   BT_GBP_MAID=your_gbp_merchant_account_id
   BT_EUR_MAID=your_eur_merchant_account_id
   BT_USD_MAID=your_usd_merchant_account_id
   BT_CAD_MAID=your_cad_merchant_account_id
   ```

   You can find these values in the Braintree Sandbox dashboard under
   **Settings → API Keys** (merchant ID / public key / private key) and
   **Settings → Merchant Accounts** (merchant account IDs). Only
   a GBP merchant account is required to run the default flow — the others are used
   for currency-specific transactions and FX quoting.

## Running the app

```bash
node server.js
```

The app listens on port `3000`. Open [http://localhost:3000](http://localhost:3000)
in your browser to start at the order selection page.

## App flow

| Route | Page | Description |
|---|---|---|
| `/` | `selection.html` | Order summary — shows line items and total, then proceeds to payment |
| `/payment` | `payment.html` | Choose a payment method (Card, Apple Pay, Google Pay, Trustly) and pay |
| `/review` | `review.html` | Shows the resulting transaction details and raw Braintree response |

Backend endpoints (in `routes/checkout.js`):

- `GET /checkout` — generates a Braintree client token
- `POST /checkout` — submits a transaction for sale/settlement
- `POST /checkout/lpm-trustly` — creates a Trustly local payment context
- `GET /checkout/fx-quote` — example FX quote request (production-only)

## Notes

- This app uses Braintree's **Sandbox** environment. Use [Braintree's test card numbers](https://developer.paypal.com/braintree/docs/reference/general/testing/#credit-card-numbers)
  to test the card flow.
- Apple Pay and Google Pay buttons will only render/function in browsers and
  environments that support them (e.g. Apple Pay requires Safari on macOS/iOS
  with a registered domain).
- Both Apple Pay and Google Pay configuration must be set before testing in the sandbox environment.
- `.env` is not committed to the repository — never commit real credentials.
