# Beauty salon IT department

I'm helping my wife to open a beauty salon.
Since I know nothing about beauty, I'm doing the technical part.
One essential part of the beauty salon is a public website.
Its purpose is to rank highly in Google for relevant queries and to let people book appointments.


## High-level software features

(Inspired by <https://glossgenius.com/>)

**Client Management:**
- Keep client notes
- View previous appointment history
- Send customized messages

**Content Management:**
- Description for services with photos and videos
- Landing pages
- Marketing pages

**Booking:**
- Set appointment slots and working hours
- Schedule, reschedule, and cancel online (without client app or login)
- Double booking
- Gap time
- Recurring appointments
- Reminders (SMS and Email)
- Fill last-minute cancellations by keeping a client waitlist
- Calendar apps integration

**Legal and Payments:**
- Square integration for payment processing
- Deposit collection upon booking
- Sign waiver forms in person and online
- Put a credit card on file for faster checkout

**Marketing:**
- SMS & Email Marketing features integrated with books
- Run custom campaigns

**Analytics:**
- Get insights into how new clients discover your business


## Frontend components

**Static pages:**
- About (short preface, location, working hours, contact information, and contact form)
- Services list
- Per-service pages

**Booking wizard:**
- Present a menu of services
- Fetch booking slots for the chosen service from the booking API
- Present available days
- When the user picks a day, show available times
- If the user picks another day, update the times
- Let the user pick a time slot
- Ask the user for a name, phone, and email
- Depending on the service configuration, get a credit card
- Submit the booking information to the booking API


## Backend components

**Static site generator:**
- Highly customizable (no built-in templates)
- Fast to build
- Blazingly fast to serve (asset minification, compression, server proximity)

**Booking API:**
- Read service durations from the procedures catalog.
- Two-way integration with external calendars (fetch availability, push new events).
- Exposes available slots for a service as a JSON API.
- Records appointment submissions.

**Customer Relations Manager:**
- Name, phone, email
- Headshot
- Records of the past procedures
- Notes

**Email & SMS:**
- Booking confirmations and reminders
- Cancellation
- Marketing

## Admin dashboard

**Appointment view**
- Linked from Calendar event sent to the employee.
- Shows client's name, phone, and email.
- Shows the name of the service, duration, and price.
- Shows dates of other appointments made with the same phone or email.
- Has a button to pay for the service.
- The button opens a payment page with suggested tips and connects with the Square terminal to accept card payments.

## Technical stack

- All content (services, about us, email templates) is stored in Google Docs.
- The static frontend is built with Vite, React, Tailwind, and Jinja templates for granular components and flexibility.
- The frontend builder synchronizes Google Docs with git-tracked reStructuredText (RST) files using [gdocsync](https://github.com/peterdemin/gdocsync/).
- Select content (hours of operation, email templates) is exported to the API as binary assets.
- FastAPI backend with PostgreSQL database.
- A single-CPU Ubuntu VM serves precompressed static content through nginx, API as a `systemd` unit, and PostgreSQL database.
- Public monorepo on GitHub (because software is not the moat for a beauty salon business).
- The admin page is built with the same stack as the public front end, but is served only behind the VPN on a separate subdomain.

**Integrations:**
- Tailscale for VPN.
- Square for payments.
- Twilio for SMS.
- Google Workspace for emails.
- Google Calendar for employees.
