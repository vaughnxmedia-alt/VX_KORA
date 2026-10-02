# Communications Intelligence — Pilot checklist

Human-led MVP. JahKnowsPR writes the intelligence. The software organizes, delivers, and tracks it. Do not add AI automation during the pilot.

## Create a new organization

1. Sign in to `/hq`.
2. Open **Communications Intelligence → Organizations**.
3. Choose **New organization**.
4. Add the name and any details you already know.
5. Save. The organization starts with onboarding incomplete so the first client can confirm the profile.

## Invite a client

1. Open the organization **Overview**.
2. Enter the client email and a simple role: Owner, Admin, Member, or Viewer.
3. Create the invitation and copy the `/join/...` link.
4. Send that link yourself (email, text, or in person). Tokens expire in 7 days.
5. Use **Resend** to rotate the token, or **Revoke** to cancel a pending invitation.
6. Existing JahKnowsPR accounts accept the same link without creating a second user.

## How a client completes onboarding

1. The invited person opens the link, signs in (or creates an account with that same email), and accepts.
2. They confirm the organization and complete the short profile.
3. Progress can be saved. When they finish, they land on `/portal`.
4. Viewers skip onboarding edits. Owners, admins, and members complete it.

## How JahKnowsPR creates intelligence

Open the organization **Intelligence** tab. Add a title, category, why it matters, recommended next step, priority, and optional due date. Only active items appear on the client Overview.

## How to update health checks

Open **Health Check**. Assess the six categories in plain language. Scores stay staff-only. Clients see the status, explanation, and recommended improvement.

## How to add approved messaging

Open **Messaging**. Keep drafts private. Mark a line **Approved** when the client may use it as written. Archive language that should leave the portal.

## How to create opportunities

Open **Opportunities**. Describe the moment, why it may matter, and a suggested next step. Clients can mark Interested or Passed. They cannot rewrite the strategy.

## How to create actions

Open **Actions**, or create an action from an opportunity or intelligence item. Clients can update Not started / In progress / Completed only.

## How counsel requests work

Clients submit **Ask JahKnowsPR** from the portal, or from a related opportunity, health item, or intelligence card. Staff add internal notes (never client-visible), write a client-facing response, then mark **Response Ready**. Clients cannot edit the response or change status.

## How to deactivate or remove access

On Overview, remove an active member or revoke a pending invitation. Revoked members lose portal access immediately. Do not delete the organization unless you intend to archive the tenant.

## Known MVP limitations

- Invitation links are copied by staff. There is no dedicated CI email sender yet.
- New users may need email confirmation before they can accept, depending on the Auth project settings.
- Client roles are stored but portal permissions stay simple: viewers cannot edit onboarding; everyone else uses the same client tools.
- No billing, media monitoring, journalist database, or automated strategy.
- Demo seed is manual: `apps/web/supabase/seeds/ci_demo_organization.sql`. Do not run it on production automatically.
- Attachments on counsel requests use the existing private bucket; keep files small and organization-specific.

## Manual demo seed

Against a development database only:

```bash
supabase db query --linked --workdir apps/web -f apps/web/supabase/seeds/ci_demo_organization.sql
```

The seed creates **Harbor & Pine Civic Kitchen [DEMO]** with fictional intelligence, health, messaging, an opportunity, an action, and one counsel request.
