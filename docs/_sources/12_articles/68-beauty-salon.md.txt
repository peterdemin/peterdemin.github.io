# Beauty salon IT department

I'm helping my wife to open a beauty salon.
Since I know nothing about beauty, I'm doing the technical part.
One essential part of the beauty salon is a public website.
It's purpose is to rank highly in Google for relevant queries and to let people book appointments.


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
- Square integration for payment processing
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
- Present a menu of services
- Fetch booking slots for the chosen service from the booking API
- Present available days
- When user picks a day, show available times
- If the user picks another day, update the times
- Let the user pick a time slot
- Ask user for a name, phone, and email
- Depending on the service configuration, get credit card
- Submit the booking information to the booking API


## Backend components

**Static site generator:**
- Highly customizable (no builtin templates)
- Fast to build
- Blazingly fast to serve (asset minification, compression, server proximity)

**Booking API:**
- Read service durations from procedures catalog.
- Two-way integration with external calendars (fetch availability, push new events) both for employees and customers.
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
- Shows name of the service, duration, and price.
- Shows dates of other appointments made with the same phone or email.
- Has a button to Pay for the service.
- The button opens a payment page, which has suggested tips and connects with Square terminal to accept card payments.

## Tech stack

- Static frontend built with Vite, React, Tailwind, and Jinja templates for granular components and flexibility. 
- FastAPI backend with PostgreSQL database. 
- Single Ubuntu VM to serve the whole thing.
- Square for payments. 
- Google Calendar for appointments booking. 
- Public monorepo on GitHub (because software is not the moat for beauty salon business). 
- Admin page is build with the same stack as the public frontend, but served only behind VPN on a separate subdomain.
