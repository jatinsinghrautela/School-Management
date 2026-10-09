# Fees and manual payment records

The Fees tab is available to school management and students. Management sees the school's ledger; a student sees only their own charges, concessions, payments and receipts, including retained charges after class promotion. Teachers, supporting staff and the direct platform-owner role cannot access this ledger. Support impersonation preserves target-role read access but cannot make financial record changes.

## Workflow

1. Create a fee schedule for a class: name, amount, currency and due date within the class's academic year. INR, USD, EUR and GBP are supported; each has two minor-unit decimal places. Schedules are immutable after creation.
2. Select a schedule and review the students before assigning it. Each selected student must be active and enrolled in that class. One schedule creates at most one charge per student; assigning it again preserves the original charge.

The ledger provides student/fee/class search and displays 20 charges per page. The current school-scoped API loads the ledger as one response; further server-side pagination remains a scaling enhancement.
3. Open a student's charge ledger to add a fixed-amount concession with a reason, or record an already received payment. Bank/cheque entries need a reference, and payment dates cannot be in the future.
4. Download the printable HTML receipt, open it locally and print or save as PDF using the browser. It has no external assets, scripts or network dependencies. Stored school/student/fee names are snapshot values and all inserted text is escaped.
5. Correct an incorrect payment or concession with a reasoned void. The original entry remains in the history. Voiding a payment restores its amount to the outstanding balance; voiding a concession restores the waived charge. A freshly downloaded receipt marks voided payments clearly. Previously downloaded files remain historical copies, so retrieve a fresh receipt for current status.

This module records manual entries; it does not move money, issue a refund, validate bank settlement, or integrate a payment gateway. There are no paid services or external API calls. Receipts do not contain digital signatures.

## Accounting and access guarantees

- Money is stored as integer minor units. API amounts must be positive safe integers, at most 1,000,000,000 minor units per entry. The frontend converts decimal text directly into integer units.
- Outstanding = original charge − active concessions − non-voided payments. Different currencies have separate totals; no exchange conversion is performed.
- Payments and concessions cannot exceed the remaining balance. Writes and ledger reads use school-locked transactions, so concurrent requests cannot collect more than the charge or show a mixed update.
- Payment/concession request keys are unique per school. Repeating the same request returns the original entry; reusing its key for different data is rejected. The UI retains the key across failed requests until a successful save.
- Neither students nor support sessions can record or void entries. Scope is checked server-side; hiding UI buttons is not the access boundary.
- Schedule assignment, entries and voids retain audit records. No ledger-deletion API exists.

MySQL migration version 6 adds typed schedule, charge, payment and concession tables, school-scoped foreign keys, student/schedule uniqueness, payment request/receipt uniqueness and positive amount constraints. Transactional API checks enforce the aggregate balance; direct database edits are not a supported accounting workflow. Back up before upgrading as described in PHASE-2.md.

## Verification and remaining work

The 39-test API suite and web production build pass. Synthetic tests cover assignment rollback, duplicate assignment, minor-unit precision, concurrent payment retry and overpayment protection, private receipts, cross-school rejection, voids, support write rejection and HTML escaping. MySQL disposable fixtures verify the new migration, charge scope/uniqueness, payment request uniqueness, numeric round-trip and amount limits. Browser automation could not initialize, so interactive UI/print review remains unverified.

Online collections, refunds, taxes, installment automation, penalties, accounting exports and payment reconciliation remain separate enhancements. Production use still requires the Phase 4 release checks. Use synthetic data for the current pilot.
