# Farmsquare WhatsApp Order Agent (Chord)

An AI teammate for **Farmsquare** ([farmsquare.ng](https://farmsquare.ng)), Nigeria’s premier digital agricultural input marketplace, built and run on TSG Labs' **Chord** platform.

It turns informal WhatsApp messages (including pidgin, local trade slang and packaging units) into verified, paid farm-input orders through Paystack, and proactively follows up on shopping carts abandoned for 1 minute with personalized WhatsApp recovery nudges.

> **Demo only.** Paystack runs in **test mode** (`sk_test_`), and all products, prices, customer records and bank details are synthetic. No live production payment keys or real customer personally identifiable information (PII) are used.

- **Live agent:** `Amaka` in the Chord workspace (`derinamole.da@gmail.com`), accessible via the Chord WhatsApp simulator.
- **Screen recording:** [Video demonstration link](https://youtu.be/placeholder-demo-video)

## Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Repository structure](#repository-structure)
4. [Set up the data](#set-up-the-data)
5. [Connect it to Chord](#connect-it-to-chord)
6. [Try it](#try-it-sample-simulator-conversations)
7. [How this was built (AI usage)](#how-this-was-built-ai-usage-disclosure)
8. [Known limits](#known-limits)

---

## What it does

### 1. Order to payment

- **Understands informal orders.** Parses unstructured farmer messages, for example *"Good day, I need 1 bottle of Atrazine for maize in Ibadan"* or *"Send me 2 cartoons of force up"*.
- **Translates local terms.** *"Cartoon"* = 12 × 1L carton; *"force up"* = Glyphosate 480 SL, a non-selective herbicide; *"maize herbicide"* = Atrazine 500 SC, a selective herbicide.
- **Checks stock and price.** Queries live inventory, stock levels and retail or carton wholesale prices (`lookup_product_stock`).
- **Quotes the order.** Gives an itemised proforma total and notes the preferred motor park delivery hub (Iwo Road in Ibadan, Utako in Abuja, Ojota in Lagos), with the waybill fee confirmed by the dispatch team.
- **Takes payment.** Generates a Paystack payment link through Chord's Paystack connector (`initialize_transaction`).
- **Confirms the order** once the payment is verified.

### 2. Agronomic safety refusal (guardrail)

- Checks crop compatibility before selling. If a farmer asks for a non-selective herbicide (such as Glyphosate / Force Up) to spray over a growing crop (standing maize, cassava or tomatoes), the agent refuses the sale and warns that it will destroy the crop.
- It then recommends a selective option (Atrazine) or offers escalation to a human agronomist.

### 3. High-value fallback

- Chord's workspace spending rules cap what a tool can charge automatically. The default rule asks for confirmation above ₦10,000 (`amount_kobo` over 1,000,000), which caught nearly every normal farm-input order.
- For this demo I raised it: `initialize_transaction` now asks to confirm above ₦1,000,000 (100,000,000 kobo), and refunds above the same amount need human approval.
- When an order is above the configured limit, no payment link is created automatically. Amaka offers bank-transfer details and a handover to a team member, so the buyer is never stranded.

### 4. One-minute abandoned-cart follow-up

- Queries pending or unpaid checkouts (`get_abandoned_orders`).
- Finds carts abandoned for 1 minute and sends a warm WhatsApp reminder naming the buyer and the items left in their cart. The 1-minute window is a demo setting.
- Offers two ways to recover payment: a Paystack checkout link or a bank transfer.
- Escalates on demand: *"Reply 'AGENT' to speak directly with our senior agronomist or customer care desk."*

### Deliberately out of scope

| Area | What happens instead |
|---|---|
| **Open-ended agronomy consulting and disease diagnosis** | The agent applies chemical refusal guardrails only and escalates general diagnosis to human agronomists, to prevent liability. |
| **Physical motor park dispatch and live GPS tracking** | Uses the standard Nigerian motor park waybill process: the destination park is recorded and the dispatch team confirms the waybill fee. |
| **Automated bank statement OCR** | Customers paying by transfer are asked for their transaction reference or receipt number. |
| **Live payment keys and production customer data** | Everything runs in sandbox / test mode with synthetic records. |

---
## How success would be measured

- **Payment completion rate:** orders paid divided by orders quoted.
- **Recovery rate:** unpaid orders that were paid after the reminder.
- **Time to payment link:** minutes from the buyer's first message to a payment link being sent.

The demo uses made-up data, so I have no real results to report. These are the numbers I would track from the first week of live use.
## Architecture

| Component | Implementation and role |
|---|---|
| **Skill instructions** | [`SKILL.md`](SKILL.md): behavioural instructions, agricultural context, tool boundaries and conversational tone. |
| **Domain references** | [`references/nigerian_ag_terms.md`](references/nigerian_ag_terms.md) (dialect, slang, chemical active ingredients) and [`references/whatsapp_templates.md`](references/whatsapp_templates.md) (proforma quotes and 1-minute recovery templates). |
| **Data tools** | Chord Custom tools (API): `lookup_product_stock` and `get_abandoned_orders`, which call a Google Apps Script web app ([`google_apps_script.js`](google_apps_script.js)) backed by a synthetic Google Sheet. |
| **Payment tools** | Chord's built-in Paystack connector (test keys): `initialize_transaction` creates the payment link, and the connector's verification tool confirms payment. |
| **Model and channel** | Chord's model engine, deployed and tested in the Chord WhatsApp simulator. |

### Failure handling

| Failure scenario | Root cause | Agent behaviour and workaround |
|---|---|---|
| **Spending-limit intercept** | The order exceeds the workspace rule on `initialize_transaction` (default ₦10,000, raised to ₦1,000,000 for this demo), so Chord asks for confirmation instead of running the tool. | The skill catches the block and presents the bank-transfer details plus a handover to a team member. |
| **Item out of stock** | The data tool returns `in_stock: false` or `stock_quantity: 0` (for example, Knapsack Sprayer). | The agent says so politely, gives the restocking ETA and suggests available alternatives or waitlisting. |
| **Non-selective herbicide on growing crops** | A farmer asks for Glyphosate / Force Up to spray over growing maize or tomatoes. | The refusal guardrail warns that non-selective chemicals kill standing crops, recommends selective Atrazine 500 SC and offers a human agronomist. |
| **Data or payment tool unavailable** | The Apps Script web app or Paystack times out or cannot be reached. | The agent apologises for the delay, gives the customer care line (`08031234567`) and the bank-transfer details. |
| **Unverified or pending payment** | Payment status is `pending` or the reference is not found. | The agent says the payment is still clearing, asks for the transfer reference or receipt, and confirms shipping once verified. |

---

## Repository structure

```text
├── SKILL.md                          # Main Chord skill instructions and guardrails
├── references/
│   ├── nigerian_ag_terms.md          # Dialect dictionary and chemical active ingredients
│   └── whatsapp_templates.md         # Proforma quotes and abandoned-cart templates
├── google_apps_script.js             # Google Apps Script web app that serves the Google Sheet
├── googlesheets_openapi.json         # OpenAPI 3.0 spec for the Google Sheets tools
├── .env.example                      # Sample environment variables (test keys only)
└── .gitignore                        # Ignores .env, node_modules and temporary logs
```

---

## Set up the data

The product catalogue and abandoned orders live in a synthetic Google Sheet, served to Chord by a Google Apps Script web app.

1. Create a Google Sheet with two tabs: `Products` (catalogue, active ingredients, retail and carton prices, stock quantities) and `Abandoned_Orders` (fictional customer names and dummy phone numbers).
2. Open **Extensions → Apps Script**, paste in [`google_apps_script.js`](google_apps_script.js), and deploy it as a **Web app**.
3. Copy the public HTTPS URL (`https://script.google.com/macros/s/.../exec`). Chord calls it with plain GET requests.

> **Security reminder:** never commit `.env` or any `sk_live_` key. Use `sk_test_` keys only. The Apps Script URL has no authentication, so it must only ever serve synthetic data.

---

## Connect it to Chord

Chord can only reach tools over a **public HTTPS URL**. Nothing needs to run on a local machine.

### Step 1: Register the data tools

1. In the teammate's tools, open **Custom tools (API)** and choose **Add connection**, or **Import OpenAPI** with [`googlesheets_openapi.json`](googlesheets_openapi.json).
2. Add `lookup_product_stock` and `get_abandoned_orders` as GET requests to the Apps Script URL.
3. Use **Test** on each tool to confirm it returns data.

### Step 2: Connect Paystack

1. Connect Chord's built-in Paystack connector with a **test** secret key and run its health check.
2. Review its approval rules (see [Known limits](#known-limits)).
3. Allow the teammate to use `initialize_transaction` and the connector's payment-verification tool.

### Step 3: Publish the skill

1. In Chord, go to **Skills → Create skill**.
2. Paste the contents of [`SKILL.md`](SKILL.md).
3. Upload the [`references/`](references/) files (`nigerian_ag_terms.md` and `whatsapp_templates.md`).
4. Click **Review and publish**. A draft skill is not active in the simulator.

### Step 4: Set the follow-up schedule

Create the schedule that triggers the abandoned-cart check (1 minute for the demo).

### Step 5: Test in the WhatsApp simulator

1. Open the Chord WhatsApp simulator.
2. Select the teammate (`Amaka`).
3. Run the sample conversations below.

---

## Try it (sample simulator conversations)

### Scenario 1: Standard order to payment

```text
Buyer:
Good day. I need 1 bottle of Atrazine 500 SC for my maize farm. Deliver to Iwo Road Motor Park in Ibadan. My name is Alhaji Haruna, 08031234567.

Amaka:
Good day Alhaji Haruna! Welcome to Farmsquare.
I've checked our warehouse inventory:
- Product: Atrazine 500 SC (Maize Selective Herbicide) 1L
- Quantity: 1 bottle
- Price: ₦5,500
- Delivery destination: Iwo Road Motor Park, Ibadan (waybill fee to be confirmed by dispatch team)
- Total: ₦5,500

Here is your secure Paystack payment link to complete the order:
👉 https://checkout.paystack.com/fsq-567-c189e4

Once payment is verified, we will package your input for dispatch immediately!
```

### Scenario 2: Agronomic safety refusal

```text
Buyer:
Can I spray Force Up (Glyphosate) over my 4-week-old growing maize to clear the weeds?

Amaka:
No, Alhaji! Please DO NOT spray Force Up (Glyphosate) over growing maize.
Glyphosate is a non-selective systemic herbicide. It kills every green plant it touches, and spraying it will completely wipe out your maize crop!

For growing maize, you need a selective herbicide such as:
👉 Atrazine 500 SC (₦5,500 per 1L bottle / ₦66,000 per carton of 12)
It kills broadleaf weeds and grasses while leaving your maize 100% safe.

Would you like me to prepare an order of Atrazine 500 SC for you instead, or connect you with our senior agronomist?
```

### Scenario 3: High-value order (spending-limit fallback)

> This transcript was captured while the default ₦10,000 rule was in place. After the limit was raised to ₦1,000,000, the same fallback applies to orders above that amount.

```text
Buyer:
I want to order 1 carton of Atrazine (12 bottles) to Ibadan.

Amaka:
[System intercept: ₦66,000 exceeds Chord ₦10,000 automated tool threshold]

Because your order is ₦66,000, our automated payment gateway has flagged this high-value transaction for standard confirmation.

You can complete your payment immediately via direct corporate transfer:
- Bank: Demo Bank of Nigeria
- Account Name: Farmsquare Agricultural Company Limited
- Account Number: 1234567890
- Amount: ₦66,000

Alternatively, reply "AGENT" and I can hand this over to a human teammate to release an authorized Paystack link. Once paid, send your receipt reference here for instant verification!
```

### Scenario 4: One-minute abandoned-cart follow-up

```text
[Simulator: Triggering 1-minute recovery check]

Amaka:
Good day Alhaji Haruna! This is Amaka from Farmsquare.
I noticed you were placing an order for 1 bottle of Atrazine 500 SC (₦5,500) to Iwo Road Motor Park, Ibadan, but checkout wasn't completed.

Would you like me to reserve this for you? You can complete your order here:
👉 Paystack Link: https://checkout.paystack.com/fsq-567-c189e4
👉 Direct Transfer: Demo Bank of Nigeria (1234567890)

If you had any bank network issues, need mixing dosage instructions, or would like to speak with our agronomist, just reply "AGENT" and I'll assist you right away!
```

---

## How this was built (AI usage disclosure)

In line with the TSG Labs guidelines, all AI assistance and manual work are disclosed.

**Antigravity AI (Google DeepMind)**
- Codebase scaffolding, first-draft regex and dialect mappings in [`references/nigerian_ag_terms.md`](references/nigerian_ag_terms.md), OpenAPI schema formatting and drafting of unit-test mocks.

**Claude (peer architectural review)**
- Feedback on Model Context Protocol (MCP) Streamable HTTP compliance, removal of duplicate files (`skills.md` and the Python mirrors), and alignment between `SKILL.md` and the problem-statement scope.

**Human engineering and evaluation (Derin Amole)**
- Formulated the core product strategy.
- Designed the agronomic refusal guardrails to protect Farmsquare from crop liability.
- Implemented the zero-PII Google Sheets data store and the Google Apps Script web app.
- Investigated and documented the Paystack spending-limit intercept and built the bank-transfer fallback workflow.
- Tested and validated all tool calls in Chord and the WhatsApp simulator.

---

## Known limits

1. **Test mode only.** Uses Paystack test credentials (`sk_test_`). No real debits or bank settlements occur.
2. **Synthetic catalogue.** To protect customer PII and proprietary store data, the agent uses a synthetic Google Sheets catalogue instead of the live WooCommerce store.
3. **Spending-limit rule.** Chord's Paystack connector asks for confirmation above a configurable amount (default ₦10,000; ₦1,000,000 in this demo). Orders above the limit fall back to bank-transfer details and a human handover, and the agent cannot verify a transfer itself.
4. **Waybill logistics.** Waybill fees vary by motor park, driver and vehicle type. The agent quotes standard regional bands and records the receiving motor park; the dispatch team confirms the final fee before departure.
5. **Bank-transfer verification.** The agent asks for a transaction reference number instead of reading transfer screenshots with computer vision.
