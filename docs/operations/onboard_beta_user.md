# Allow beta users in the app

## Waitlist submission 

automatic (strengthsync) POST /api/waitlist → intakeLead  → upsert into the  
marketing Worker's D1 leads table, keyed on email. Then  Loops contact with userGroup: role, source: "waitlist". The welcome  
email get sent to user.

## Reading the list. ⚠️  MANUAL

 The hourly cron only ships a count (waitlist_signup_count),  but we need to check D1 for the users email

## ⚠️  MANUAL — creating the Auth0 user.

 Auth0 Dashboard → User Management → Users → ceate User, then trigger the set-password email. 

## ⚠️  MANUAL — the invite email itself.

 Auth0's built-in provider sends the reset-password link  [no-reply@auth0user.net](mailto:no-reply@auth0user.net), unconfigurable

Athlete sets password → signs in — automatic. Hosted page at auth.strengthsync.ai. Lands on / → RootRedirect → /track.

The rest is automatic

---



&nbsp;