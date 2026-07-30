# Assumptions and Unresolved Business Decisions

## Assumptions

- English is the default language.
- Simplified Chinese is available at `/zh`.
- Membership costs SGD 39.90 and lasts 60 days from admin activation.
- Registration does not activate membership.
- Payment is manually confirmed during soft launch.
- The first deployment starts with one Super Admin.
- Final menu items, prices, images and categories are not yet approved.
- Final logo is not yet approved.

## Configurable

- Membership fee and duration in `site_settings`.
- Future payment provider in `site_settings`.
- Menu categories and menu items in Supabase.
- Admin role assignments in `staff_role_assignments`.
- Rate limit environment variables.

## Needed From Business Owner

- Approved Qing Yun Jian logo.
- Final menu names, descriptions, prices and drink images.
- Store opening hours.
- Contact phone number and email.
- Social media URLs.
- Final membership benefits.
- Referral reward amount and confirmation process.
- Legal-approved privacy policy and membership terms.
- Payment provider decision: Stripe, HitPay or another provider.
