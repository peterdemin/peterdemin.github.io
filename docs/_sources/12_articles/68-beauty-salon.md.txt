# Beauty salon IT department

## High-level software features

(based on <https://glossgenius.com/>)

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
- Fill last minute cancellations by keeping a client waitlist
- Calendar apps integration

**Legal and Payments:**
- Stripe integration for payment processing
- Deposits collection upon booking
- Sign waiver forms in person and online
- Put credit card on file for faster checkout

**Marketing:**
- SMS & Email Marketing features integrated with books
- Run custom campaigns

**Analytics:**
- Get insights into how new clients discover your business


## Frontend components

**Static pages:**
- About (short preface, location, working hours, contact information and form)
- Services list
- Per-service pages

**Booking wizard:**
- Present slots for the chosen service (days, and times)
- Pick a slot
- Get name, phone, and email
- Get credit card
- Submit the booking


## Backend components

**Static site generator:**
- Highly customizable (no builtin templates)
- Fast to build
- Blazingly fast to serve from CDN (asset minification)

**Booking API:**
- Read service durations from procedures catalog.
- Two-way integration with external calendars (fetch availability, push new events) both for employees and customers.
- Exposes available slots for a procedure as a JSON API.
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
