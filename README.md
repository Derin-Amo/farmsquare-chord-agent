# Farmsquare WhatsApp Order Agent (Chord)

An AI teammate for **Farmsquare** ([farmsquare.ng](https://farmsquare.ng)), Nigeria’s premier digital agricultural input marketplace, built and run on TSG Labs' **Chord** platform.

It turns informal WhatsApp messages (including pidgin, local trade slang, and packaging units) into verified, paid farm-input orders through Paystack, and proactively follows up on shopping carts abandoned for 1 minute with personalized WhatsApp recovery nudges.

> **Demo only.** Paystack runs in **test mode** (`sk_test_`), and all products, prices, and customer records are synthetic. No live production payment keys or real customer personally identifiable information (PII) are used.

**Live agent:** `Amaka` in the Chord workspace (`derinamole.da@gmail.com`). Accessible via the Chord WhatsApp simulator.  
**Screen recording:** [Video Demonstration Link](https://youtu.be/placeholder-demo-video) *(Detailed 2:50 timed storyboard and transcript available in [`submission/04_screen_recording_script.md`](submission/04_screen_recording_script.md))*.

---

## What It Does

1. **Order to Payment**:
   - Parses unstructured farmer messages (e.g., *"Good day, I need 1 bottle of Atrazine for maize in Ibadan"* or *"Send me 2 cartoons of force up"*).
   - De-aliases vernacular Nigerian ag terms (*"cartoon"* = 12×1L carton; *"force up"* = Glyphosate 480 SL non-selective herbicide; *"maize herbicide"* = Atrazine 500 SC selective herbicide).
   - **Agronomic Safety Refusal (Guardrail)**: Strictly checks crop compatibility. If a farmer requests a non-selective herbicide (such as Glyphosate/Force Up) for spraying over growing crops (e.g. standing maize, cassava, or tomatoes), the agent immediately refuses the sale, warns that it will destroy the crop, and recommends selective Atrazine or offers human agronomist escalation.
   - Queries live inventory, stock levels, and retail/carton wholesale prices (`lookup_product_stock`).
   - Quotes an itemized proforma total and notes the preferred motor park delivery hub (Iwo Road in Ibadan, Utako in Abuja, Ojota in Lagos) with waybill fee confirmation.
   - Generates instant Paystack payment links (`create_payment_link`).
   - **Graceful High-Value Fallback**: If an order exceeds Chord's ₦10,000 automated tool threshold (`amount_kobo gt 1000000.0`), the agent automatically provides Farmsquare's verified corporate account (**First Bank of Nigeria, Account No: 2036041820**) so the buyer is never stranded.
   - Confirms the order once payment is verified (`verify_payment`).

2. **1-Minute Abandoned Cart Follow-Up**:
   - Queries pending or unpaid customer checkouts (`get_abandoned_orders`).
   - Identifies carts abandoned for 1 minute and sends a warm WhatsApp reminder mentioning the buyer by name and the exact items left in their cart.
   - Provides two easy payment recovery options: Paystack checkout link or First Bank corporate account transfer.
   - Escalates on demand: *"Reply 'AGENT' to speak directly with our senior agronomist or customer care desk."*

**Deliberately Out of Scope**:
- **Open-Ended Agronomy Consulting & Disease Diagnosis**: The agent enforces chemical refusal guardrails only, escalating general diagnosis to human agronomists to prevent liability.
- **Physical Motor Park Dispatch & Live GPS Tracking**: Replaced by standard Nigerian motor park waybill protocol (destination park recorded, waybill fee confirmed by warehouse dispatch team).
- **Automated Bank Statement OCR**: Customers paying via direct transfer are asked for their transaction reference/receipt number rather than relying on computer vision.
- **Live Payment Keys & Production Customer Data**: Strictly operated in sandbox/test mode with synthetic records.

---

## Architecture

| Component | Implementation & Role |
|---|---|
| **Skill Instructions** | [`SKILL.md`](SKILL.md): Behavioral instructions, agricultural context, tool invocation boundaries, and conversational tone. |
| **Domain References** | [`references/nigerian_ag_terms.md`](references/nigerian_ag_terms.md) (dialect, slang, chemical active ingredients) and [`references/whatsapp_templates.md`](references/whatsapp_templates.md) (proforma quotes and 1-minute recovery templates). |
| **Tools** | `lookup_product_stock`, `get_abandoned_orders`, `create_payment_link`, `verify_payment`. |
| **Tool Server** | Zero-dependency Node.js MCP server ([`tools/server.js`](tools/server.js)) implementing Model Context Protocol over Streamable HTTP (`/mcp` and `/health`), plus a serverless Google Apps Script HTTPS Webhook endpoint ([`google_apps_script.js`](google_apps_script.js)). |
| **Model & Channel** | Powered by the Chord LLM engine, deployed and tested in the Chord WhatsApp simulator. |

### Failure Handling Matrix

| Failure Scenario | Root Cause | Agent Behavior & Workaround |
|---|---|---|
| **Chord ₦10k Action Threshold Intercept** | Order exceeds ₦10,000 (e.g. ₦66,000 carton) and Chord blocks tool execution with `amount_kobo gt 1000000.0`. | Skill catches the safety intercept and immediately presents First Bank corporate account details (`2036041820`) plus human teammate transfer option. |
| **Item Out of Stock** | Database returns `in_stock: false` or `stock_quantity: 0` (e.g., Knapsack Sprayer). | Agent informs buyer politely, states warehouse restocking ETA, and suggests available alternatives or waitlisting. |
| **Non-Selective Herbicide on Growing Crops** | Farmer asks for Glyphosate/Force Up to spray over growing maize or tomatoes. | Agronomic refusal triggers: agent warns that non-selective chemicals kill standing crops, recommends selective Atrazine 500 SC, and offers human agronomist handoff. |
| **Tool Server / Network Latency** | Paystack API timeout or unreachable tool server. | Agent apologizes for the network delay, provides manual customer care line (`08031234567`), and outputs bank transfer details. |
| **Unverified / Pending Payment** | Payment status is `pending` or reference not found. | Agent advises buyer that payment is still clearing, prompts for transfer reference/receipt, and confirms orders ship once verified. |

---

## Repository Structure

```text
├── SKILL.md                          # Main Chord skill instructions & guardrails
├── references/
│   ├── nigerian_ag_terms.md          # Dialect dictionary & chemical active ingredients
│   └── whatsapp_templates.md         # Proforma quotes & abandoned cart templates
├── tools/
│   ├── paystack_tool.js              # Paystack test mode integration logic (Node.js)
│   ├── woocommerce_tool.js           # Stock lookup & waybill rate calculator
│   └── server.js                     # MCP Streamable HTTP & REST server
├── google_apps_script.js             # Live Google Apps Script HTTPS Webhook for Google Sheets
├── googlesheets_openapi.json         # OpenAPI 3.0 specification for Google Sheets tools
├── woocommerce_openapi.json          # OpenAPI 3.0 specification for WooCommerce tools
├── .env.example                      # Sample environment variables (test keys only)
├── .gitignore                        # Ignores .env, node_modules, and temporary logs
└── submission/                       # TSG Labs recruitment submission package
    ├── 01_role_and_problem_statement.md   # Role preference & 4-sentence problem statement
    ├── 04_screen_recording_script.md      # Screen recording storyboard & transcript (2:50)
    ├── 05_deployment_field_notes.md       # Field notes (3 core engineering incidents & platform feedback)
    ├── 06_go_live_note.md                 # Executive handover note for Farmsquare leadership
    └── FULL_SUBMISSION_PACKAGE.md         # Consolidated submission package
```

---

## Run the Tools Locally

### Requirements
- **Node.js 18+** (uses native `fetch` and standard library; **zero external npm packages required**).

```bash
# 1. Clone the repository and navigate to root
cd farmsquare-order-agent

# 2. Copy the sample environment file
cp .env.example .env

# 3. Test Paystack tool directly in CLI (uses mock test mode by default)
node tools/paystack_tool.js

# 4. Start the MCP & REST tool server
node tools/server.js
```
The server will start on `http://localhost:8000`:
- **Health check**: `http://localhost:8000/health`
- **MCP Endpoint**: `http://localhost:8000/mcp`

> **Security Reminder**: Never commit `.env` or any `sk_live_` keys. Use `sk_test_` keys only.

---

## Connect It to Chord

Chord requires tools to be accessible over a **public HTTPS URL**. Localhost cannot be reached by Chord cloud servers.

### Step 1: Expose the Tool Server to Public HTTPS
You can expose the local MCP server using any public tunneling tool or free cloud host:

- **Option A: Localtunnel**
  ```bash
  npx localtunnel --port 8000
  # Output: https://farmsquare-tools.loca.lt
  ```
  - MCP URL: `https://farmsquare-tools.loca.lt/mcp`
  - Health check: `https://farmsquare-tools.loca.lt/health`

- **Option B: Ngrok**
  ```bash
  ngrok http 8000
  ```

- **Option C: Serverless Webhook (Live in Demo)**
  For 100% cloud uptime without keeping a local terminal running, deploy [`google_apps_script.js`](google_apps_script.js) as a Google Apps Script Web App backed by Google Sheets. It automatically exposes a public HTTPS endpoint (`https://script.google.com/macros/s/.../exec`).

### Step 2: Register the Tool in Chord
1. In Chord, open **Teammate $\rightarrow$ Tools $\rightarrow$ Add Custom Tool (MCP or API)**.
2. Enter your public HTTPS URL (`https://.../mcp` or the Google Apps Script URL).
3. Confirm that the health check returns `status: "ok"`.
4. Limit the teammate to the exact tool names:
   - `lookup_product_stock`
   - `get_abandoned_orders`
   - `create_payment_link`
   - `verify_payment`

### Step 3: Publish the Skill
1. In Chord, navigate to **Skills** $\rightarrow$ **Create Skill**.
2. Paste the contents of [`SKILL.md`](SKILL.md).
3. Upload the [`references/`](references/) directory (`references/nigerian_ag_terms.md` and `references/whatsapp_templates.md`).
4. Click **Review and publish** (a draft skill is not active in the simulator).

### Step 4: Test in the WhatsApp Simulator
1. Open the Chord WhatsApp simulator.
2. Select your teammate (`Amaka`).
3. Run the sample conversations below.

---

## Try It (Sample Simulator Conversations)

### Scenario 1: Standard Order to Payment (Happy Path)
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

### Scenario 2: Agronomic Safety Refusal Guardrail
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

### Scenario 3: High-Value Wholesale Order (Chord ₦10k Action Threshold Intercept)
```text
Buyer:
I want to order 1 carton of Atrazine (12 bottles) to Ibadan.

Amaka:
[System intercept: ₦66,000 exceeds Chord ₦10,000 automated tool threshold]

Because your order is ₦66,000, our automated payment gateway has flagged this high-value transaction for standard confirmation.

You can complete your payment immediately via direct corporate transfer:
- Bank: First Bank of Nigeria
- Account Name: Farmsquare Agricultural Company Limited
- Account Number: 2036041820
- Amount: ₦66,000

Alternatively, reply "AGENT" and I can hand this over to a human teammate to release an authorized Paystack link. Once paid, send your receipt reference here for instant verification!
```

### Scenario 4: 1-Minute Abandoned Cart Follow-Up
```text
[Simulator: Triggering 1-minute recovery check]
Amaka:
Good day Alhaji Haruna! This is Amaka from Farmsquare.
I noticed you were placing an order for 1 bottle of Atrazine 500 SC (₦5,500) to Iwo Road Motor Park, Ibadan, but checkout wasn't completed.

Would you like me to reserve this for you? You can complete your order here:
👉 Paystack Link: https://checkout.paystack.com/fsq-567-c189e4
👉 Direct Transfer: First Bank of Nigeria (2036041820)

If you had any bank network issues, need mixing dosage instructions, or would like to speak with our agronomist, just reply "AGENT" and I'll assist you right away!
```

---

## How This Was Built (AI Usage Disclosure)

In compliance with TSG Labs recruitment guidelines, all AI assistance and manual validation are disclosed:

- **Antigravity AI (Google DeepMind)**:
  - Used for codebase scaffolding, authoring initial regex and dialect mappings in [`references/nigerian_ag_terms.md`](references/nigerian_ag_terms.md), formatting OpenAPI schemas, and drafting unit test mocks.
- **Claude / Peer Architectural Review**:
  - Provided feedback on Model Context Protocol (MCP) Streamable HTTP compliance, recommended eliminating duplicate files (`skills.md` and Python mirrors), and guided the alignment between `SKILL.md` and the problem statement scope.
- **Human Engineering & Evaluation (Derin Amole)**:
  - Formulated the core product strategy and candidate role focus (Technical Product Management & Growth).
  - Designed the agronomic refusal safety guardrails to protect Farmsquare from crop liability.
  - Implemented the zero-PII Google Sheets data store and Google Apps Script Web App.
  - Investigated and documented the Paystack ₦10,000 action threshold intercept and developed the First Bank fallback workflow.
  - Tested and validated all tool invocations directly in Chord and the WhatsApp simulator.

---

## Known Limits

1. **Test Mode Only**: Uses Paystack test credentials (`sk_test_`). No real monetary debits or live bank settlements occur.
2. **Synthetic Catalog vs. Live WooCommerce**: To protect customer PII and proprietary store data, the agent connects to a privacy-safe synthetic Google Sheets catalog rather than querying live customer database records.
3. **Chord ₦10k Action Threshold Ceiling**: Chord's financial connector limits automated tool link generation to 1,000,000 kobo (₦10,000). Commercial bulk orders (>₦10,000) automatically degrade to First Bank corporate account transfer details.
4. **Waybill Logistics**: Waybill fees vary by motor park driver and vehicle type. The agent quotes standard regional bands and captures the receiving motor park; final manifest fees are confirmed by warehouse dispatch before departure.
5. **Bank Transfer Receipt Verification**: The agent prompts for transaction reference numbers rather than performing automated computer vision / OCR on bank transfer screenshot images.

---

## Submission Documents

All required recruitment deliverables are organized in the [`submission/`](submission/) directory:

- [`submission/01_role_and_problem_statement.md`](submission/01_role_and_problem_statement.md) — Role preferences & exactly 4-sentence problem statement.
- [`submission/04_screen_recording_script.md`](submission/04_screen_recording_script.md) — Timed 2:50 screen recording script and simulator walkthrough.
- [`submission/05_deployment_field_notes.md`](submission/05_deployment_field_notes.md) — Three technical field incidents (Paystack threshold intercept, PII isolation, Chord parameter semantics).
- [`submission/06_go_live_note.md`](submission/06_go_live_note.md) — Non-technical executive handover note for Farmsquare leadership.
- [`submission/FULL_SUBMISSION_PACKAGE.md`](submission/FULL_SUBMISSION_PACKAGE.md) — Consolidated submission document.
