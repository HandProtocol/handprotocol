# Document Retention and Destruction Policy

> Establishes minimum retention periods for the Corporation's records, the destruction process for records past their retention period, and the suspension of destruction in the event of investigation or litigation.

**Status:** Draft v0.1 · May 2026 · Pre-adoption · Pending counsel review

---

## Section 1. Purpose

This Policy serves several purposes:

a. Ensures that the Corporation retains records required by law, by funders, and by sound governance practice for adequate periods.

b. Establishes a routine destruction process for records past their retention period, reducing storage burden and protecting privacy.

c. **Suspends destruction immediately** when the Corporation has notice of, or reasonable anticipation of, government investigation, audit, litigation, or subpoena. Destruction of records during such an event is a federal crime under Sarbanes-Oxley §802 (18 U.S.C. §1519), which applies to all entities, nonprofit included.

d. Sets forth the responsibilities of the Treasurer, Secretary, Executive Director, and staff for compliance.

## Section 2. Scope

This Policy applies to all records the Corporation maintains, in any format:

a. Paper records.

b. Electronic records, including email, cloud storage, code repositories, databases, and shared drives.

c. Audio and video recordings, including meeting recordings.

d. Reciprocate-group-owned artifacts held in trust by the Corporation (LoRA adapters, training data, evaluation logs).

## Section 3. Records custodian

The **Secretary** is the official records custodian for corporate records (Bylaws, Articles, minutes, resolutions, governance policies). The **Treasurer** is the records custodian for financial records. The **Executive Director** is the records custodian for program, personnel, and operational records. The **Sovereign Reciprocates Oversight Committee Chair** is the records custodian for AI workstream records.

## Section 4. Retention schedule

### Permanent retention

The following are retained **permanently** in original form and in backed-up electronic form:

- Certificate of Formation and all amendments
- Bylaws and all amendments
- Board and committee minutes
- IRS Determination Letter and Form 1023 application
- Annual Form 990s (all schedules)
- Texas franchise tax exemption letters (AP-204)
- Annual audited / reviewed / compiled financial statements
- Corporate seal (if any) and stock or membership records (HAND has none)
- Real property records and intellectual property registrations
- Records of any litigation, investigation, or government inquiry
- The Annual AI Accountability Report each year

### Seven years

- General ledger and chart of accounts
- Bank statements and reconciliations
- Cancelled checks
- Cash receipts and disbursement journals
- Accounts payable and accounts receivable ledgers
- Payroll registers, W-2s, 1099s, time records
- Tax returns and supporting workpapers
- Insurance policies (after expiration)
- Contracts and agreements (after expiration or termination)
- Grant agreements and grantor reports (after final report accepted)
- Procurement records and invoices

### Three to five years

- Personnel files (after separation; 5 years recommended; some states require 7)
- Volunteer/Contributor records (after last engagement; 3 years)
- Donor records and acknowledgment letters (5 years; cross-check IRS Schedule B requirements)
- Routine correspondence
- Bid records of unsuccessful bidders
- Travel and expense reports

### One year or less

- Routine email not falling into any of the categories above (12 months, then auto-purged)
- Drafts of documents that have been finalized (purge after final adopted)
- Routine operational logs (server logs, build logs), 90 days by default

### Sovereign Reciprocates records (special schedule)

| Record type | Retention | Notes |
|---|---|---|
| Reciprocate-group adapter weights | Held until handoff, then transferred; not retained by HAND afterward | Reciprocate group owns; sovereignty principle 2 |
| Training data (per Reciprocate group) | Held in trust during engagement, deleted on revocation or graduation within 30 days | Sovereignty principle 3 |
| Audit logs of model calls, retrievals, tool calls | 5 years, accessible to Reciprocate group throughout | Sovereignty principle 6 |
| Evaluation reports (de-identified) | Permanent in aggregate, individual evaluations 3 years | For longitudinal study |
| Model cards | Permanent; versioned | Public artifact |
| Consent records | Permanent; cannot be deleted without breaking sovereignty chain | Required for audit |
| Algorithmic Impact Assessments | Permanent; versioned | Public artifact |

## Section 5. Email and electronic records

a. Email is a record when it documents a Corporation decision, transaction, policy, or program action. Routine social or scheduling email is not a record.

b. Staff and directors shall preserve email that meets the record definition by saving to the appropriate shared drive or document management system, not in personal inboxes.

c. Personal devices used for Corporation work are subject to this Policy. The Corporation does not assert ownership of personal devices, but Corporation records on those devices remain Corporation records.

d. Cloud storage providers used for Corporation records (Google Workspace, Notion, GitHub) must have a documented data processing agreement and must comply with the Privacy Policy.

## Section 6. Destruction procedure

a. Records past their retention period and not subject to a destruction hold (Section 7) shall be destroyed annually as part of a documented destruction process supervised by the appropriate records custodian.

b. Paper records shall be cross-cut shredded.

c. Electronic records shall be deleted using methods appropriate to the storage medium; for sensitive records, secure deletion or device disposal procedures apply.

d. A **destruction log** shall be maintained, identifying the categories of records destroyed, the dates, and the supervising custodian. The log itself is retained for 7 years.

## Section 7. Suspension of destruction (hold)

**Routine destruction shall be suspended immediately upon any of the following:**

a. Notice of, or reasonable anticipation of, a government investigation, audit, examination, or subpoena.

b. Notice of, or reasonable anticipation of, litigation, including formal demand letters from counsel.

c. Notice of, or reasonable anticipation of, a regulatory inquiry by the IRS, the Texas Attorney General, the Texas Comptroller, the Texas Secretary of State, or any other regulator with jurisdiction over the Corporation.

d. A request from the Audit Committee Chair or Board Chair in connection with a whistleblower report or internal investigation.

The suspension applies to **all records that could be relevant** to the matter, broadly construed.

The Executive Director shall promptly issue a written **legal hold notice** to all custodians and affected staff identifying the records subject to hold. The hold remains in effect until released in writing by counsel or the Board Chair.

**Violating a hold is a federal crime under 18 U.S.C. §1519** (penalties up to 20 years imprisonment and fines). The Corporation will report any suspected violation to counsel and law enforcement as appropriate.

## Section 8. Reciprocate-data special protections

Reciprocate-group-owned training data is subject to additional protections:

a. **Revocable consent** is the default. A Reciprocate group may revoke training consent at any time. Within 30 days of revocation, the affected training data and any adapter trained on that data must be destroyed or retrained without the revoked data, per the Data Sovereignty and AI Policy.

b. **Revocation does not override legal hold.** If a legal hold applies, destruction is suspended until the hold releases. The Reciprocate group will be informed of the hold to the extent permitted.

c. **Cross-Reciprocate-group data extraction is prohibited.** Records from one Reciprocate group's engagement may not be repurposed for training adapters serving a different Reciprocate group, even after retention period has expired.

## Section 9. Training and acknowledgment

a. All new staff, directors, and Contributors with access to Corporation records shall receive a copy of this Policy at onboarding and shall acknowledge receipt in writing.

b. Annual refresher training is required for staff and directors.

c. The Secretary maintains the acknowledgment records.

## Section 10. Annual review

The Audit Committee shall review this Policy and the retention schedule annually, considering:

a. Changes in law, IRS guidance, or grantor requirements.

b. New record types created during the year (especially in the Sovereign Reciprocates program).

c. Patterns of legal holds or destruction issues from the prior year.

## Open questions

- **Personnel file retention.** Drafted at 5 years. Texas does not impose a specific minimum for general personnel files; some experts recommend 7 to cover statute-of-limitations exposure for various claims. Tighten with counsel.
- **Donor records.** 5 years drafted; IRS Schedule B requires donor info for some donors and that data is part of Form 990 attachments, which are permanent. Cross-check.
- **Cloud storage providers.** Google Workspace and Notion and GitHub are the current default stack. Each requires a DPA. Recordkeeping point: keep DPAs in the contracts file (permanent retention until 7 years after contract termination).
- **Backup retention.** Backups may extend effective retention beyond stated periods. Document backup-cycle policy separately so destruction-period commitments are real, not nominal.

---

*Template references: National Council of Nonprofits document retention guidance; SOX §802 (18 U.S.C. §1519); IRS recordkeeping requirements for exempt organizations.*
