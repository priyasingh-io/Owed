# Product Requirements Document (PRD)
## Product Name: ClaimIt *(working title)*
### Tagline: "Never lose a warranty. Never leave money unclaimed."

---

## 1. Overview

**Problem Statement**
People routinely lose money and rights they're already entitled to because tracking them requires too much manual paperwork:
- Warranties expire unused because receipts are lost or forgotten.
- Product issues go unclaimed because filing a warranty claim is tedious.
- Billions in unclaimed refunds, dividends, insurance payouts, and provident fund balances go unclaimed globally because people don't know they exist or how to file for them.

**Vision**
A single place where users upload receipts and personal records, and the app automatically tracks what they're entitled to — reminding them before value is lost, and helping them file the claim when it matters.

**Target Users**
- Primary: General consumers who buy electronics, appliances, and other warrantied goods (broad, global audience).
- Secondary (Phase 2): Users in specific countries (starting with India) who may have unclaimed dividends, PF balances, or insurance payouts.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target (6 months post-launch) |
|---|---|---|
| Help users track warranties | # active items tracked per user | 5+ avg |
| Prevent missed warranty claims | % of expiring items with claim filed or dismissed by user | 60%+ |
| Drive habitual use | Weekly active users / monthly active users | 25%+ |
| Validate Phase 2 demand | Waitlist signups for unclaimed-money feature | 500+ |
| Extraction accuracy | % receipts correctly parsed without manual correction | 85%+ |

---

## 3. Scope

### In Scope — MVP (Phase 1: Warranty & Purchase Tracker)
- User signup/login
- Upload receipt (image or PDF)
- AI extraction of product, purchase date, price, seller, warranty period
- Manual edit/correction of extracted data
- Dashboard of tracked items (active, expiring soon, expired)
- Automated expiry reminders (email)
- AI-drafted warranty claim letter/email generator
- Item categorization (electronics, appliances, furniture, etc.)

### In Scope — Phase 2 (Unclaimed Money Finder)
- Country-specific unclaimed asset lookup (starting with India: IEPF unclaimed dividends, EPFO unclaimed PF)
- Guided claim-filing assistant for matched unclaimed assets

### Out of Scope (for now)
- Legal advice or guarantees of claim success
- Direct integration with retailer/manufacturer claim systems (no automated filing on user's behalf)
- Multi-language support (English only at launch)
- Native mobile apps (web-first, responsive)
- Automatic email/inbox scanning for receipts (manual upload only at MVP)

---

## 4. User Stories

### Must-Have (MVP)
1. As a user, I can create an account so my data is saved across sessions.
2. As a user, I can upload a photo or PDF of a receipt so I don't have to type in item details.
3. As a user, I can see extracted item details and correct any mistakes before saving.
4. As a user, I can view a dashboard of all my items sorted by warranty status.
5. As a user, I receive an email reminder before a warranty expires.
6. As a user, I can report an issue with an item and get an AI-drafted claim email I can copy/send.
7. As a user, I can delete or archive items I no longer want tracked.

### Should-Have
8. As a user, I can filter/search items by category, brand, or status.
9. As a user, I can manually add an item without a receipt upload.
10. As a user, I can export my item list (CSV) for personal records.

### Nice-to-Have (Post-MVP)
11. As a user, I get notified of relevant recalls for products I own.
12. As a user, I can forward receipt emails to a dedicated address for auto-import.
13. As a user in India, I can check if I have unclaimed dividends or PF balance tied to my PAN/UAN.

---

## 5. Functional Requirements

### 5.1 Authentication
- Email/password and/or OTP-based login
- Session persistence
- Password reset flow

### 5.2 Receipt Upload & Extraction
- Accept JPG, PNG, PDF (max 10MB)
- Extract via AI: product name, brand, purchase date, price, seller/retailer, warranty duration (explicit or inferred by category)
- Flag low-confidence extractions for manual review
- Store original file for reference

### 5.3 Item Dashboard
- List/grid view with status badges: Active / Expiring Soon (≤30 days) / Expired
- Sort and filter by expiry date, category, brand
- Item detail view showing all extracted + edited fields and original receipt

### 5.4 Reminders
- Automated email at 30 days, 7 days, and 1 day before expiry
- User-configurable reminder preferences (on/off, lead time)

### 5.5 Claim Assistant
- User describes the issue in free text
- AI generates a formal claim/complaint email using item details + issue description
- User can copy, edit, or send via their own email client

### 5.6 Account & Data Management
- Edit profile
- Delete account (with full data deletion per privacy requirements)
- Download personal data (GDPR/data portability consideration)

---

## 6. Non-Functional Requirements

- **Performance:** Receipt extraction result returned within 10 seconds for 95% of uploads.
- **Reliability:** 99.5% uptime target post-launch.
- **Security:** All receipt files and personal data encrypted at rest and in transit.
- **Privacy:** No sharing of user data with third parties; clear data retention/deletion policy.
- **Accessibility:** WCAG 2.1 AA compliance for core flows.
- **Scalability:** Architecture should support growth from hundreds to tens of thousands of users without redesign.

---

## 7. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| AI misreads receipts (poor image quality, non-standard formats) | Manual correction UI; confidence scoring; allow manual entry fallback |
| Users don't trust app with purchase/financial data | Clear privacy policy, minimal data collection, transparent AI usage |
| Warranty period not stated on receipt | Maintain a lookup table of typical warranty periods by category/brand as fallback |
| Phase 2 unclaimed-money data sourcing varies wildly by country/legal complexity | Start with one well-documented source (e.g., India IEPF) before expanding |
| Claim letters could be seen as legal advice | Clear disclaimer: tool assists with drafting, not legal representation |

**Open questions:**
- Do we charge (freemium/subscription) or stay free with a future paid tier for Phase 2?
- Should reminders also support SMS/push, or is email sufficient for MVP?

---

## 8. Release Plan

| Phase | Scope | Timeline |
|---|---|---|
| Alpha | Core upload → extract → dashboard, no reminders | Week 1-2 |
| Beta | Add reminders + claim assistant, invite small user group | Week 3-4 |
| Public MVP Launch | Polish, feedback fixes, public release | Week 5-6 |
| Phase 2 | Unclaimed money finder (India pilot) | Post-MVP, based on traction |
