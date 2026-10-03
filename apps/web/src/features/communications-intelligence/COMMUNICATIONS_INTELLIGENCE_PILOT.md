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

## How to enroll an organization in the pilot

1. Open the organization and use the **Pilot** tab.
2. Set status to **Invited** or **Onboarding**, add a start date, and optionally a cohort name.
3. Internal notes stay staff-only.
4. Recommended pilot length: **8–12 weeks**. That is long enough to see onboarding, a few weekly briefs, at least one monthly summary, and whether the client actually uses the portal.

Suggested statuses: Invited → Onboarding → Active. Use **Needs Attention** when there is no recent portal activity or overdue work. Use **Paused** or **Completed** when the cohort ends.

## How to conduct the initial health assessment

Open **Health Check** before the first weekly brief. Assess all six categories in plain language. Mark **Initial health check complete** on the Pilot tab. Scores stay staff-only.

## How often to add intelligence

Add or refresh intelligence **weekly**, or sooner if something time-sensitive appears. Do not flood the portal. One high-priority item and a few recommended actions are enough for most weeks. Mark **First intelligence delivered** after the first client-visible item.

## How to prepare the Weekly Communications Brief

Open **Reports**. Write five short notes: what needs attention, the best opportunity, the most important action, an upcoming communications moment, and a note from JahKnowsPR. Save a draft, then **Publish to portal**. The client sees it at the top of `/portal`. Do not auto-generate or email it.

## How to record outcomes

Open **Outcomes**. Record a real result (coverage, interview, partnership, messaging correction, and so on). Link the related opportunity, action, or intelligence item when it exists. Put strategy notes in **Internal notes**. Clients see title, type, description, date, and URL only.

## How to publish monthly reports

Open **Reports**. Write the eight sections. Leave the status on **Draft** or **Ready for Review** until a human has edited it. Clients see the report on `/portal/reports` only after status is **Published**. Use Print / Save PDF on the client report page for a clean branded print layout.

## How to review client feedback

- Organization **Pilot** tab: recommendation usefulness and the short pilot form.
- **Pilot** dashboard: cohort-wide feedback and organizations that need follow-up.
- Clients can also answer “Was this recommendation useful?” on intelligence, opportunities, actions, health, messaging, weekly briefs, and monthly reports.

## What product metrics to monitor

On **Pilot** and **Learning**:

- Last client activity and last portal login
- Actions completed this month
- Opportunities reviewed
- Counsel requests submitted
- Onboarding and milestone completion
- Most common intelligence, health, and opportunity types
- Recommendation usefulness (yes / somewhat / no)

These numbers help decide what might later be automated. They are not a strategy.

## What information should remain internal

- Pilot enrollment notes and internal status
- Admin notes on outcomes, reports, briefs, and counsel
- Draft, ready-for-review, and archived reports or briefs
- Activity event logs
- Product-learning aggregates
- Unpublished counsel responses

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
