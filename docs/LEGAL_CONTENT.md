# Legal Content — Privacy Policy & Terms of Service

Canonical source of record for Atlaas' legal copy, plus the pre-launch checklist of real-world facts that still need filling. Written in this repo (not the code) so the copy can be reviewed without reading React.

## How legal content is stored

There is **no hardcoded legal text**. The full Privacy Policy and Terms of Service live as i18n keys under `privacy.*` and `terms.*` in `src/lib/i18n/locales/{en,fr,ar}/common.json`, and are read through `useTranslation('common')` + `t()` like every other user-facing string. English is the drafting language and the canonical text; `fr` and `ar` are translations of it.

**One shared component renders both documents.** `src/features/legal/LegalPage.tsx` takes a single prop `doc: 'privacy' | 'terms'`, which doubles as the i18n key prefix. `src/pages/PrivacyPage.tsx` renders `<LegalPage doc="privacy" />` and `src/pages/TermsPage.tsx` renders `<LegalPage doc="terms" />`; the routes `/privacy` and `/terms` are wired declaratively in `src/app/router.tsx`. The component pulls the whole sections array with `t(\`${doc}.sections\`, { returnObjects: true })` and maps each `{ heading, body }` into a `<section>` with a scroll-spied table of contents. This is why the two documents share identical chrome (branded gradient header, sticky ToC, numbered sections) with zero duplicated markup — the *only* difference between Privacy and Terms is which i18n subtree is read.

**Interpolated facts come from one config, not the translations.** The bodies carry `{{var}}` tokens; a dynamic `t()` key can't be statically typed, so `LegalPage` fills them itself via a small `fill()` regex against `src/features/legal/legal.config.ts` (`LEGAL.contactEmail`, `LEGAL.jurisdiction`, `LEGAL.minAge`). The `{{date}}` in the "Last updated" line is filled separately through normal `t()` interpolation from `LEGAL.lastUpdated`. Keeping these facts in one config means changing the contact email or jurisdiction updates all three languages at once — translators never re-type a fact, so the languages can't drift on it.

**Parity is enforced by CI, not by discipline.** `scripts/check-i18n.mjs` flattens every leaf key (descending into arrays, so array *length* counts) and fails non-zero if `en`/`fr`/`ar` don't have an identical key set. Verified current state: **7 Privacy sections and 10 Terms sections in all three languages.** A translator who drops or adds a section breaks the build.

> Note (`docs/ARCHITECTURE.md`, "Still TODO"): the architecture doc still lists "Real Privacy Policy + Terms content" as pending. That refers to the **legal facts** below being placeholder defaults — the prose itself is written and shipped, but the company/jurisdiction/contact details are provisional and must be confirmed before launch.

---

## Privacy Policy (English canonical text)

Title: **Privacy Policy**
Subtitle: *How Atlaas collects, uses and protects your data.*
Last-updated line: `Last updated: {{date}}`

### 1. Introduction
Atlaas is a creative-inspiration platform where people discover, publish and discuss visual work. This Privacy Policy explains what information Atlaas collects, why, how it is used and protected, and the choices and rights you have. By creating an account or using Atlaas, you agree to the practices described here.

### 2. Information We Collect
We collect only what we need to run the service: your account information (username, email and a password, which is never stored in plain text — only as a secure hash); basic Google profile information if you choose to sign in with Google; your profile details such as a bio and avatar; the content you create (works, comments and likes); who you follow; and basic technical information your browser sends and that is strictly necessary to keep you signed in. We do not knowingly collect information from children under {{minAge}}.

### 3. How We Use Your Information
We use your information to create and secure your account, keep you signed in, display your profile and content to other users as intended, power your discovery feed, operate and improve the platform, protect it against abuse, and comply with legal obligations. We do not sell your personal information and do not use it for third-party advertising.

### 4. Sharing Your Information
Your public content — published works, your username, your comments and your public profile — is visible to other users, which is the purpose of the platform. Beyond that, we share personal information only with service providers who host or operate Atlaas on our behalf, with Google as needed for optional sign-in, and when required by law or to protect users and the service. We do not otherwise share your personal data.

### 5. Your Rights and Choices
Depending on where you live, you may have the right to access, correct, delete, export or restrict the processing of your personal data, and to withdraw consent. You can edit your profile at any time. To exercise any of these rights, contact us at {{contactEmail}}. You may also lodge a complaint with your local data-protection authority.

### 6. Data Security
We take reasonable technical and organisational measures to protect your data, including hashing passwords, using encrypted connections (HTTPS) and restricting access to personal information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. We keep your data only as long as your account is active or as needed to provide the service and meet legal obligations; when you delete your account, we delete or anonymise your personal data within a reasonable period.

### 7. Changes to This Policy
We may update this Privacy Policy from time to time. When we make material changes, we will update the date above and, where appropriate, notify you in the app. Your continued use of Atlaas after changes take effect means you accept the revised policy. Questions? Reach us at {{contactEmail}}.

---

## Terms of Service (English canonical text)

Title: **Terms of Service**
Subtitle: *The rules for using Atlaas.*
Last-updated line: `Last updated: {{date}}`

### 1. Acceptance of Terms
These Terms of Service govern your access to and use of Atlaas. By creating an account or using the platform, you agree to these Terms. If you do not agree, please do not use Atlaas.

### 2. Eligibility and Accounts
You must be at least {{minAge}} years old to use Atlaas. You are responsible for the information you provide, for keeping your password confidential, and for all activity under your account. Notify us at {{contactEmail}} if you believe your account has been compromised. You may sign in with an email and password or with Google.

### 3. Your Content
You keep ownership of the works, comments and other content you post. By posting on Atlaas, you grant us a non-exclusive, worldwide, royalty-free licence to host, store and display your content only as needed to operate and promote the platform, such as showing your work in the discovery feed and on your profile. You are responsible for your content and confirm you have the rights to post it.

### 4. Acceptable Use
You agree not to post content that is illegal, infringing, hateful, harassing or sexually explicit; not to impersonate others; not to upload malware or attempt to breach security; not to scrape or harvest data from the platform without permission; and not to spam or abuse other users. We may remove content and suspend or terminate accounts that violate these rules, and administrators may moderate content to enforce these Terms.

### 5. Intellectual Property
Atlaas — including its name, logo, design and software — belongs to its operators and is protected by applicable law. These Terms do not grant you any right to use our branding without prior written permission. Your content remains yours, subject to the licence described in the section on Your Content.

### 6. Third-Party Services
Atlaas relies on third-party services to function, such as Google for optional sign-in and our hosting provider. Your use of those services may be subject to their own terms and privacy policies, and we are not responsible for third-party services we do not control.

### 7. Termination
You may stop using Atlaas and delete your account at any time. We may suspend or terminate your access if you breach these Terms or to protect the platform and its users. Sections that by their nature should survive termination — such as intellectual property, disclaimers and limitation of liability — continue to apply.

### 8. Disclaimers and Limitation of Liability
Atlaas is provided "as is" and "as available," without warranties of any kind, to the fullest extent permitted by law. We do not guarantee the service will be uninterrupted, error-free or secure. To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages arising from your use of the platform, which may change, pause or be discontinued at any time.

### 9. Changes to These Terms
We may update these Terms from time to time. When we make material changes, we will update the date above and, where appropriate, notify you in the app. Your continued use after changes take effect means you accept the revised Terms.

### 10. Governing Law and Contact
These Terms are governed by the laws of {{jurisdiction}}, and any disputes will be subject to its courts. For any questions about these Terms, contact us at {{contactEmail}}.

---

## Placeholder table — must be filled before launch

Two kinds of placeholder exist: **(A) interpolation tokens** that are literally present in the source text as `{{var}}` and resolved from `src/features/legal/legal.config.ts` at render time, and **(B) missing details** the drafted copy never provides and that a launch-ready policy is normally expected to carry. The config's own comment flags (A) as *"defensible defaults, not legal advice — confirm with the team before shipping."*

### A. Interpolation tokens present in the text

| Token | Current value (`legal.config.ts`) | Appears in | Action before launch |
|---|---|---|---|
| `{{contactEmail}}` | `privacy@atlaas.app` | Privacy §5, §7; Terms §2, §10 | Confirm a real, monitored inbox (see DPO note below). |
| `{{jurisdiction}}` | `France` | Terms §10 (governing law + courts) | Confirm governing-law jurisdiction with the operating entity. |
| `{{minAge}}` | `15` | Privacy §2; Terms §2 | Confirm minimum age (15 = French GDPR digital-consent age; differs by country). |
| `{{date}}` | `2026-07-14` (`LEGAL.lastUpdated`) | Privacy & Terms "Last updated" line | Set to the real effective/publication date at launch. |

> Note: `{{date}}` is resolved via `t()` interpolation from `LEGAL.lastUpdated`; the other three are resolved by `LegalPage`'s `fill()` regex from the same config. No other `{{…}}` tokens exist in the legal subtrees.

### B. Details the drafted copy does not yet contain

| Detail | Status in current text | Where it belongs |
|---|---|---|
| Company legal name (registered entity) | **Absent** — text refers only to "Atlaas" and "its operators" (Terms §5) | Privacy intro/§7; Terms §5, §10 |
| Registered business address | **Absent** — no postal address anywhere | Privacy contact section; Terms contact section |
| DPO / privacy contact identity | **Generic email only** (`privacy@atlaas.app`); no named controller or DPO | Privacy §5, §7 |
| Governing law / competent courts | **Placeholder** (`France` via `{{jurisdiction}}`) | Terms §10 |
| Effective / "last updated" date | **Placeholder** (`2026-07-14`) | Both documents' header line |
| Data-protection authority named | **Generic** — "your local data-protection authority" (Privacy §5); no specific authority (e.g. CNIL) | Privacy §5 (optional but common) |
| Named subprocessors / hosting provider | **Generic** — "our hosting provider," "service providers" (Privacy §4, Terms §6) | Privacy §4 (a subprocessor list is often expected) |

**No fabricated clauses.** Everything in the two document sections above is a faithful transcription of the English `common.json` source; the tables only flag what is placeholder or absent. Filling (A) is a one-line-per-value edit in `legal.config.ts` (propagates to all three languages); filling (B) requires editing the prose in all three `common.json` files and will change the `check-i18n.mjs` key counts only if sections are added or removed.
