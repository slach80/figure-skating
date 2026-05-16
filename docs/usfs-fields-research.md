# USFS Fields Research: Batch Upload Template & EntryEeze Inventory

*Research date: 2026-05-16. Conducted via Gemini CLI web search.*

---

## 1. USFS Batch Upload Roster Template Columns

**Finding:** A definitive, publicly available CSV batch upload template directly from US Figure Skating (USFS) was **not found** through web search. The official template is gated behind the USFS club administrator portal (Event Management System / EMS). The columns below are inferred from general membership requirements and related system data.

**Confidence: Medium-Low** — Inferred fields based on common practice. Exact headers and order are speculative without the official template. A club admin with portal access would need to download the actual template to confirm.

| Column Name | Type | Required/Optional | Notes |
|---|---|---|---|
| `FirstName` | Text | Required | Skater's legal first name |
| `LastName` | Text | Required | Skater's legal last name |
| `DateOfBirth` | Date | Required | Format likely `MM/DD/YYYY` or `YYYY-MM-DD`; used for age verification |
| `Gender` | Text | Required | Typically `M` or `F` |
| `EmailAddress` | Email | Required | Primary contact email |
| `PhoneNumber` | Text | Optional | Primary contact phone number |
| `AddressLine1` | Text | Required | Street address |
| `AddressLine2` | Text | Optional | Apartment, suite, etc. |
| `City` | Text | Required | City of residence |
| `State` | Text | Required | Two-letter abbreviation (e.g., `CA`, `NY`) |
| `ZipCode` | Text | Required | 5-digit or 9-digit ZIP code |
| `Country` | Text | Required | `USA` for domestic members |
| `USFSMemberID` | Numeric | Optional | Existing USFS ID for renewals/updates |
| `MembershipType` | Text | Required | e.g., "Full Member", "Associate Member", "Introductory Member" |
| `ClubName` | Text | Required | Name of the affiliated club |
| `ClubID` | Numeric | Optional | Unique identifier for the club |
| `ParentFirstName` | Text | Required if minor | First name of parent/guardian |
| `ParentLastName` | Text | Required if minor | Last name of parent/guardian |
| `ParentEmailAddress` | Email | Required if minor | Email of parent/guardian |

**Action item:** Lana (club contact) should log into the USFS member portal and download the actual batch upload CSV template to confirm exact column headers and order. This is the only reliable way to get the ground truth.

---

## 2. EntryEeze Field Inventory

**Confidence: High** — Based on EntryEeze documentation, user guides, and club portal examples found via web search.

### Skater / Member Fields

| Field | Notes |
|---|---|
| First Name | Legal first name |
| Last Name | Legal last name |
| Middle Initial | Optional |
| Date of Birth | |
| Gender | |
| USFSA ID Number | Also accepts LTS USA number |
| USFSA ID Expiration Date | |
| Home Club Affiliation | |
| Test Levels | Moves in the Field, Freeskate, Dance, Pairs — current and passed levels |
| Coach's Name | For system lookup and email confirmations |
| Pronunciation Guide | Optional, for announcer use at competitions |
| Disability / Medical Information | For waivers or special accommodations |
| Emergency Contact Name | |
| Emergency Contact Relationship | |
| Emergency Contact Phone | |

### Parent / Guardian Fields (for minors or family accounts)

| Field | Notes |
|---|---|
| Parent/Guardian Full Name | |
| Email Address | Used for communication, account validation, receipts |
| Password | Account login credential |
| Address (Street, City, State, Zip) | Option to copy from another family member |
| Phone (Home, Cell, Work) | |
| Relationship to Skater | |

### Competition / Event-Specific Fields

| Field | Notes |
|---|---|
| Event Entry Choices | Which events/classes the skater is entering |
| Music Title | For program music |
| Music Artist | |
| Music Length | |
| ISRC Code | |
| Music File Upload | |
| Planned Program Content (PPC) | Required for competitive events |
| Jacket / T-Shirt Size | For event merchandise |
| Volunteer Service Information | Hours or roles |

### Account / Payment Fields

| Field | Notes |
|---|---|
| Login ID / Username | |
| PIN Number | For subsequent logins |
| Credit Card Details | Processed securely |
| Billing Address | |
| Waiver / Agreement Acceptance | Club rules, USFS code of conduct, liability release, medical waivers |

---

## 3. Gap Analysis

Fields EntryEeze collects that are NOT part of a minimal USFS batch membership upload — these are "nice to have" for our platform and are essential for club operations beyond just USFS compliance.

| Field | Why It Matters for Our Platform |
|---|---|
| Test Levels (all disciplines) | Core to club management; needed for class placement, competition eligibility |
| Coach's Name | Club operational need; links skater to coach for scheduling and comms |
| Pronunciation Guide | Competition feature; nice UX differentiator |
| Disability / Medical Info | Likely required by most clubs for safety; store with appropriate access controls |
| Emergency Contact (full set) | Required for most club activities; not a USFS membership field |
| Event Entry Choices | Competition management module — out of scope for initial MVP |
| Music Information / PPC | Competition management — out of scope for initial MVP |
| Jacket / T-Shirt Size | Event management convenience field |
| Volunteer Service Info | Club admin feature; useful for compliance with club bylaws |
| Account Password / PIN | Our platform will handle auth independently |
| Billing Address / Credit Card | Our platform will have its own payment processing |
| Granular Waiver Status | We'll need our own waiver management — do not rely on EntryEeze's |
| USFSA ID Expiration Date | Important! USFS membership expires annually; need to track and trigger renewal reminders |

---

## 4. Data Format Notes

| Field | Format |
|---|---|
| Date of Birth | `MM/DD/YYYY` most likely for USFS; store as ISO `YYYY-MM-DD` internally |
| State | Two-letter uppercase abbreviation (`CA`, `NY`, etc.) |
| Gender | Store as single char (`M`, `F`) or full word — decide on one and normalize |
| USFSA ID | Numeric string |
| ZIP Code | 5-digit standard; accept 9-digit (ZIP+4) optionally |
| Email | Standard validation; used as primary account identifier in EntryEeze |
| Phone | Accept various input formats; store normalized as digits only (`1234567890`) |
| Membership Type | USFS has specific membership tier names — confirm exact strings from portal |

**Confidence: Medium** — General best practices; specific USFS format requirements need confirmation from the official template.

---

## 5. Research Gaps & Next Steps

1. **Get the actual USFS template**: Ask Lana to log into the USFS club admin portal and download the batch upload CSV template. This is the only way to confirm exact column headers and order.
2. **USFS membership tiers**: Confirm the exact membership type strings USFS accepts (Full, Associate, Introductory, etc.).
3. **EntryEeze data export**: If the club is migrating from EntryEeze, request a full data export to see the actual column names in their export CSV — this will tell us what we need to import for existing members.
4. **USFSA ID format**: Confirm whether USFS IDs are always numeric and their expected length.
