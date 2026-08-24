# 🎟️ TicketVault - High-Demand Ticket Booking & Allocation Platform

> An enterprise-grade, high-concurrency ticket booking engine for movies and concerts with real-time visual seat mapping, atomic CAS concurrency locking, TTL seat hold auto-release, automated FIFO waitlist reallocation, and scannable QR ticket generation.

---

## 🌟 Key Capabilities & Architectural Highlights

- ⚡ **Atomic Concurrency Protection**: High-throughput Compare-And-Swap (CAS) database-level locks guarantee zero double-holding or race conditions even under high flash-sale load.
- ⏱️ **Seat Hold with Configurable TTL**: Seats selected on the visual grid are held with a live countdown timer (e.g. 10 minutes). Abandoned holds are automatically released by background workers.
- 🔄 **Automated Waitlist Reallocation**: Sold-out shows feature a FIFO waitlist per seat category. When a booking is cancelled or a hold is dropped, the system automatically assigns the seat to the next person in queue, sends an urgent notification email with a time-limited claim link (15 mins), and auto-cascades if unclaimed.
- 🎫 **Scannable QR Code Tickets**: Confirmed bookings generate cryptographically verifiable QR admission passes delivered via HTML email and downloadable as digital passes.
- 🔍 **Live In-App QR Scanner**: Built-in verification scanner for venue staff and organisers to validate admission and prevent duplicate entries.
- 📧 **Built-In Live Email Outbox**: View and test generated ticket emails, QR passes, and waitlist claim links directly inside the web UI without needing third-party SMTP services.
- 🏛️ **Visual Venue & Seating Architect**: Admin builder to configure interactive venue layouts with VIP, Premium, and Standard rows, aisles, and capacities.
- 📊 **Organiser Revenue Analytics**: Real-time sales metrics, occupancy percentages, and waitlist queue monitors per show.

---

## 🏗️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Socket.IO (WebSockets) |
| **Database & ORM** | SQLite (Zero-friction local dev) / PostgreSQL (Production), Prisma ORM |
| **Background Jobs** | Continuous Node TTL Expiry Worker & Scheduler |
| **Security & Utilities** | JWT Authentication, Bcrypt Password Hashing, QRCode, Nodemailer |

---

## 🚀 Quick Start (One-Command Setup)

### 1. Prerequisites
- **Node.js** v18+ (Node v20 or v22 recommended)
- **npm** v9+

### 2. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd "ticket booking"

# Run setup (Installs server & client dependencies, pushes DB schema, and seeds demo data)
npm run setup
```

### 3. Start Development Server
```bash
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`
- **WebSocket Server**: `ws://localhost:5000`

---

## 👤 Demo Personas & Credentials

You can log in manually or use the **1-Click Quick Role Switcher** in the top navbar:

| Persona | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@example.com` | `password123` | Browse shows, select seats, checkout, view passes, cancel bookings, join waitlist |
| **Organiser** | `organiser@events.com` | `password123` | Create events, set tier pricing, view revenues & occupancy stats, scan QR tickets |
| **Admin** | `admin@tickets.com` | `admin123` | Manage venues, design custom seating grids, system-wide metrics |

---

## 🧪 Testing Concurrency & Race Conditions

Run the built-in automated concurrency stress test:
```bash
npm run test:concurrency
```
*Dispatches 10 simultaneous parallel hold requests for the exact same seat: exactly 1 request succeeds (HTTP 200/held) and the other 9 receive clean HTTP 409 Conflict rejections.*

---

## 📋 Database Schema

```prisma
model User {
  id           String          @id @default(uuid())
  email        String          @unique
  name         String
  passwordHash String
  role         String          @default("CUSTOMER") // CUSTOMER, ORGANISER, ADMIN
  phone        String?
  events       Event[]
  bookings     Booking[]
  holds        SeatHold[]
  waitlists    WaitlistEntry[]
}

model Venue {
  id            String   @id @default(uuid())
  name          String
  address       String
  city          String
  totalCapacity Int
  layoutConfig  String   // JSON { rows: [{ label, category, seatCount }] }
  events        Event[]
}

model Event {
  id              String          @id @default(uuid())
  title           String
  description     String
  category        String          @default("MOVIE") // MOVIE, CONCERT
  venueId         String
  venue           Venue           @relation(...)
  organiserId     String
  showTime        DateTime
  status          String          @default("PUBLISHED")
  tierPricing     String          // JSON { VIP: 45, PREMIUM: 30, STANDARD: 18 }
  holdTtlMinutes  Int             @default(10)
  seats           Seat[]
  holds           SeatHold[]
  bookings        Booking[]
  waitlistEntries WaitlistEntry[]
}

model Seat {
  id        String          @id @default(uuid())
  eventId   String
  row       String
  number    Int
  label     String          // e.g. "A-1"
  category  String          // VIP, PREMIUM, STANDARD
  price     Float
  status    String          @default("AVAILABLE") // AVAILABLE, HELD, BOOKED, WAITLIST_RESERVED
  version   Int             @default(1)
}

model SeatHold {
  id          String    @id @default(uuid())
  eventId     String
  seatId      String
  userId      String
  holdToken   String    @unique
  expiresAt   DateTime
  isExpired   Boolean   @default(false)
}

model Booking {
  id               String        @id @default(uuid())
  bookingReference String        @unique // e.g. "TB-89KJ-X3P1"
  eventId          String
  userId           String
  customerName     String
  customerEmail    String
  totalAmount      Float
  status           String        @default("CONFIRMED") // CONFIRMED, CANCELLED
  qrCodeData       String
  qrCodeImage      String
  checkInStatus    String        @default("PENDING") // PENDING, CHECKED_IN
  items            BookingItem[]
}

model WaitlistEntry {
  id              String         @id @default(uuid())
  eventId         String
  userId          String
  category        String         // VIP, PREMIUM, STANDARD
  status          String         @default("WAITING") // WAITING, OFFERED, CLAIMED, EXPIRED
  position        Int
  offerToken      String?        @unique
  offerExpiresAt  DateTime?
  offeredSeatId   String?
}
```

---

## 📡 REST API Documentation

### Authentication
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Authenticate & obtain JWT
- `GET /api/auth/me` - Get current session profile

### Venues & Seating Layouts
- `GET /api/venues` - List all venues
- `GET /api/venues/:id` - Get venue details
- `POST /api/venues` - *(Admin)* Create venue with custom seating rows
- `PUT /api/venues/:id` - *(Admin)* Update venue configuration

### Events & Shows
- `GET /api/events` - Browse shows (filter by `category`, `search`, `status`)
- `GET /api/events/:id` - Get event details, availability stats, and tier prices
- `POST /api/events` - *(Organiser/Admin)* Create event & auto-generate seat rows
- `GET /api/organiser/dashboard` - *(Organiser)* Revenue, sales, and waitlist metrics

### Real-Time Seats & Concurrency Holds
- `GET /api/seats/event/:eventId` - Retrieve visual seat grid with real-time status
- `POST /api/seats/hold` - Atomic CAS hold seats (`{ eventId, seatIds }`)
- `POST /api/seats/release` - Release held seats on checkout cancellation
- `GET /api/seats/hold/:holdToken` - Retrieve active hold details and remaining TTL

### Checkout & Bookings
- `POST /api/bookings/checkout` - Confirm held seats, generate QR code pass, dispatch email
- `GET /api/bookings/ref/:reference` - Get booking pass by reference
- `GET /api/bookings/my` - Get logged-in customer's booking history
- `POST /api/bookings/:id/cancel` - Cancel booking and trigger waitlist reallocation

### Priority Waitlist Engine
- `POST /api/waitlist/join` - Join FIFO waitlist for event & seat category
- `GET /api/waitlist/offer/:token` - Inspect time-limited offer status & countdown
- `POST /api/waitlist/claim` - Convert time-limited offer token to active checkout hold
- `GET /api/waitlist/my` - Get customer's waitlist positions and active offers

### Admin, QR Scanner & Email Outbox
- `POST /api/admin/verify-ticket` - Validate QR code and check in attendees
- `GET /api/admin/metrics` - System-wide performance overview
- `GET /api/emails/outbox` - In-app outbox logs for inspecting ticket emails and claim links

---

## ⚙️ Environment Configuration (`.env`)

```ini
PORT=5000
DATABASE_URL="file:./dev.db" # Or postgresql://user:pass@host:5432/dbname
JWT_SECRET="your-jwt-secret-key-min-32-chars"
CLIENT_URL="http://localhost:5173"
HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=15
NODE_ENV=development

# Optional SMTP Mail credentials (In-app preview outbox is used by default)
# SMTP_HOST="smtp.mailtrap.io"
# SMTP_PORT=2525
# SMTP_USER="your-smtp-user"
# SMTP_PASS="your-smtp-password"
```

---

## ☁️ Deployment Guide

### Deploying to Render / Railway
1. Set Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `PORT=5000`).
2. Build Command: `npm run build`
3. Start Command: `npm run start`

---

## 📄 License & Assessment
Developed for **Unthinkable Solutions** Technical Assessment. Complete source code and technical design included.
