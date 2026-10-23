# Farmsquare WhatsApp Order Agent (Chord)

An AI teammate for **Farmsquare** ([farmsquare.ng](https://farmsquare.ng)), a Nigerian agricultural input marketplace, built and run on TSG Labs' **Chord** platform.

It turns informal WhatsApp messages (pidgin, trade slang, local pack sizes) into verified, paid farm-input orders through Paystack, and follows up on orders that were quoted but never paid.

> **Demo only.** Paystack runs in test mode (`sk_test_`). All products, prices, customers and bank details shown here are synthetic. No live keys or real customer data are used.

- **Live agent:** `Amaka`, in the Chord workspace you gave me access to. Open it in the WhatsApp simulator.


## What it does

1. **Order to payment.** Reads the order, converts local terms (for example "cartoon" = 12 x 1L carton, "force up" = glyphosate), checks stock and price with `lookup_product_stock`, quotes an itemised total with the destination motor park, sends a Paystack link with `create_payment_link`, and confirms only after `verify_payment` succeeds.
2. **Abandoned-cart follow-up.** On a schedule, `get_abandoned_orders` finds unpaid carts and Amaka sends one reminder naming the buyer and items. For this demo the window is **1 minute** and **one reminder** is sent. These are demo settings so the flow can be shown in a short recording; a live window and reminder count would be set by Farmsquare.
3. **Crop-safety refusal.** If a buyer asks to spray a non-selective herbicide (glyphosate) over a growing crop, Amaka declines, explains why, and offers a selective product suited to that crop or a human agronomist. She does not give general agronomy advice or dosage.
4. **High-value fallback.** Chord's workspace spending limit caps what a tool can charge automatically. The default is ₦10,000 (`amount_kobo` over 1,000,000 is blocked), and I raised it for this demo. Orders above the configured limit cannot get a payment link, so Amaka offers transfer details and a handover to a team member instead.

**Out of scope:** disease diagnosis and open-ended agronomy, dispatch and live tracking (the destination park is recorded and the waybill fee is confirmed by the team), reading bank-transfer screenshots.

## Architecture

| Part | What it is |
|---|---|
| Skill | [`SKILL.md`](SKILL.md) with [`references/`](references/) (local terms, message templates) |
| Tools | `lookup_product_stock`, `get_abandoned_orders`, `create_payment_link`, `verify_payment` |
| Data tools | `lookup_product_stock` and `get_abandoned_orders` are Chord **Custom tools (API)**: GET requests to a Google Apps Script web app ([`google_apps_script.js`](google_apps_script.js)) that reads a synthetic Google Sheet. They do not go through `tools/server.js`. |
| Payments | Paystack test mode |
| Payment tools | `create_payment_link` and `verify_payment` (Paystack test mode).  |
| Hosting | The Apps Script web app is hosted by Google. 

## Run it locally

Node.js 18+, no packages to install.

```bash
cp .env.example .env     # add a Paystack TEST key and your Sheets settings
node tools/server.js     # http://localhost:8000  (health: /health, MCP: /mcp)
```

Never commit `.env` or any `sk_live_` key.

## Connect it to Chord

Chord cannot reach localhost, so anything Chord calls needs a public HTTPS URL.

1. **Data tools:** deploy `google_apps_script.js` as a web app on a Google Sheet, then in the teammate's tools add each one under **Custom tools (API)** (**Add connection**, or **Import OpenAPI** with `googlesheets_openapi.json`). Use **Test** on each tool to check the response.
2. **Payment tools:** paystack .
3. Make sure the teammate is allowed to use all four tools.
4. Upload `SKILL.md` with `references/` as a skill, then **Review and publish**. A saved draft is not .
5. Set up the follow-up schedule (1 minute for the demo).
6. Test in the in-app conversation, then in the WhatsApp simulator.

## Try it

**Order to payment**

```text
Buyer: Good day. I need 1 bottle of Atrazine 500 SC for my maize. Deliver to Iwo Road Motor Park, Ibadan. Alhaji Haruna, 08031234567.

Amaka: Good day Alhaji Haruna! Atrazine 500 SC (selective herbicide, 1L) x 1 = ₦5,500.
Delivery: Iwo Road Motor Park, Ibadan (waybill fee confirmed by our dispatch team).
Pay securely here: https://checkout.paystack.com/<test-link>
I'll confirm your order as soon as payment is verified.
```

**High-value fallback (order above the workspace limit)**

```text
Buyer: I want 1 carton of Atrazine (12 bottles) to Ibadan.

Amaka: Your total is ₦66,000, which is above the limit for an automated payment link.
You can pay by transfer: Bank: <demo bank> | Account: <demo account number> | Amount: ₦66,000.
Reply "AGENT" and a team member will confirm your transfer and release your order.
```

This fallback only appears when an order exceeds the workspace limit. The refusal and follow-up conversations are in the recording script.


## Known limits

1. Paystack test mode only; no real money moves.
2. Mock Google Sheets data, not the live WooCommerce store.
3. Orders above the workspace spending limit fall back to transfer plus a human, and the agent cannot verify a transfer itself. TODO: say who confirms it and how. The limit is a workspace setting and would need a deliberate value before go-live.
4. The follow-up uses a 1-minute window and a single reminder for demonstration only.
5. The Apps Script endpoint has no authentication (anyone with its URL can read the sheet). That is acceptable for synthetic data and not for a live catalogue.
6. Waybill fees are estimates until the dispatch team confirms.
7. Planned but not built:
Claude as the reasoning engine for crop diagnostics (suggesting likely causes from a farmer's description and the right input to buy). With more time it would end in review by a human agronomist; until then Amaka does not diagnose, she only refuses unsafe requests and hands over.
Bank-transfer verification. verify_payment only checks Paystack references and I did not build screenshot or transfer matching, so a team member confirms transfers.
Live WooCommerce catalogue, a real WhatsApp number and live Paystack keys. Ruled out by the exercise's ground rules, so I used a synthetic Google Sheet and the simulator.
Production follow-up cadence. The demo uses one reminder after 1 minute so it fits a short recording; a live version needs realistic intervals agreed with Farmsquare.


## Submission documents

[`submission/`](submission/) holds the problem statement (01), recording script (04), deployment field notes (05) and go-live note (06).
