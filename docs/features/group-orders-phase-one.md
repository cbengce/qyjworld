# Group orders — phase one

Public entry: `/en/group-orders` and `/zh/group-orders`, linked from home, header and footer. Customers select currently available catalogue items and submit an order request or quotation enquiry. Both begin as requested; neither is paid or confirmed. Prices in original artwork are explicitly excluded from the quotation. Delivery availability and fees require a quote. No invented bulk discount, minimum quantity, lead-time guarantee or payment integration is published.

Admin entry: `/{locale}/admin/group-orders`, linked from Admin Portal. Server checks an active staff account with super_admin or manager role for both reads and mutations. Anonymous visitors and partners cannot read customer requests. Quote amounts are SGD; acceptance must be recorded before confirmation. Confirmed prices are immutable. Terminal states cannot reopen. Each mutation appends actor, timestamp and notes and uses version comparison to prevent lost updates.

Persistence uses the already deployed, service-role-only `webhook_events` intake table with isolated provider `qyj_group_orders_v1` and event_type `group_order.requested`. Payload stores the order, authoritative product snapshots, private contact details, quotation and change history. The generic event's processing_status denotes intake completion, not fulfilment. POS event UI excludes this provider. No schema migration or customer access grants are needed. Existing RLS revokes anon/authenticated access; only server service role reads/writes this namespace. It does not produce POS transactions, partner commissions or paid-sales statistics.

Submission ID is a browser UUID; unique provider/external_event_id prevents duplicate requests. Identical retries return the saved reference; changed payload with the same ID returns conflict. Server validates menu availability, quantity limits, calendar date (Singapore, tomorrow onwards), contact/address fields, honeypot and body size. Same-origin checks and process-local rate limiting protect intake; distributed abuse protection belongs to a later stage. No public endpoint exposes stored contact data.

Operations: staff contact the customer using the supplied details, agree availability and pricing, record the quote, then record acceptance and confirm. Saving a status does not send an email or charge the customer. Collection/delivery details remain subject to staff confirmation. Customer success receipt appears only after a database write or verified identical retry.

Phase two reserved: dedicated order/payment schema when checkout and shared carts are introduced, online payment, customer quote acceptance links, notifications, capacity rules, team shared carts and repeat-order management. Do not present these as implemented.

Validation: `node scripts/test-group-orders.cjs`, `npm run typecheck`, `npm run lint`, Vercel build, live public submission and idempotent retry; anonymous admin redirect. Customer text is bilingual, British English, uses existing authorised catalogue and leaves pricing to quotation.

## WhatsApp quotations and free guest accounts

Saved quotes now have WhatsApp, email-draft and copy actions with a customer-facing preview. Messages include product quantities, amounts, total, reference and requested fulfilment details; internal notes and change history are never included. Draft links do not send anything or mark delivery successful. Unquoted, fulfilled and cancelled requests cannot produce an active quotation draft. Ambiguous WhatsApp numbers are rejected rather than assigned an arbitrary country; 8-digit Singapore numbers receive +65.

Free guest signup uses Supabase Auth signUp and its configured email confirmation flow, not admin auto-confirm. It creates no paid membership, commission or points account. Guest details are stored in user metadata. The public order route attaches authUserId from the verified server session only; client-supplied identity is rejected. Signed-in users can view their own orders and saved quotations in /guest; service queries explicitly match both the order namespace and the authenticated user ID. Anonymous requests are never linked retrospectively by a matching email address. Checkout remains available without registration. No member discounts are conferred by guest status.

The confirmation email depends on the existing Supabase Auth email and redirect configuration. No customer or test email is sent by Codex as part of deployment. Quotation emails open the owner's email app with a draft; server delivery and WhatsApp Business automation are not part of this change.
