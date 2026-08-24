import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Clean existing records
  await prisma.emailLog.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Hash default password
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@tickets.com',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      phone: '+1 (555) 019-2831',
    },
  });

  const organiser = await prisma.user.create({
    data: {
      email: 'organiser@events.com',
      name: 'Apex Entertainment Group',
      passwordHash: defaultPasswordHash,
      role: 'ORGANISER',
      phone: '+1 (555) 018-9942',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Alex Johnson',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      phone: '+1 (555) 014-5521',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'waitlist.demo@example.com',
      name: 'Sarah Connor',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      phone: '+1 (555) 017-8833',
    },
  });

  console.log('👤 Created demo users (Admin, Organiser, Customer).');

  // 4. Create Venues with Custom Grid Layouts
  const imaxLayout = {
    rows: [
      { label: 'A', category: 'VIP', seatCount: 8, aisleAfter: [4] },
      { label: 'B', category: 'VIP', seatCount: 8, aisleAfter: [4] },
      { label: 'C', category: 'PREMIUM', seatCount: 10, aisleAfter: [2, 8] },
      { label: 'D', category: 'PREMIUM', seatCount: 10, aisleAfter: [2, 8] },
      { label: 'E', category: 'STANDARD', seatCount: 12, aisleAfter: [3, 9] },
      { label: 'F', category: 'STANDARD', seatCount: 12, aisleAfter: [3, 9] },
    ],
  };

  const arenaLayout = {
    rows: [
      { label: 'A', category: 'VIP', seatCount: 10, aisleAfter: [5] },
      { label: 'B', category: 'VIP', seatCount: 10, aisleAfter: [5] },
      { label: 'C', category: 'PREMIUM', seatCount: 12, aisleAfter: [3, 9] },
      { label: 'D', category: 'PREMIUM', seatCount: 12, aisleAfter: [3, 9] },
      { label: 'E', category: 'PREMIUM', seatCount: 12, aisleAfter: [3, 9] },
      { label: 'F', category: 'STANDARD', seatCount: 14, aisleAfter: [4, 10] },
      { label: 'G', category: 'STANDARD', seatCount: 14, aisleAfter: [4, 10] },
    ],
  };

  const venue1 = await prisma.venue.create({
    data: {
      name: 'Grand Horizon Cinema - IMAX Dolby Laser',
      address: '742 Evergreen Boulevard',
      city: 'San Francisco, CA',
      totalCapacity: 60,
      layoutConfig: JSON.stringify(imaxLayout),
    },
  });

  const venue2 = await prisma.venue.create({
    data: {
      name: 'Starlight Symphony Dome',
      address: '100 Olympic Way',
      city: 'Los Angeles, CA',
      totalCapacity: 84,
      layoutConfig: JSON.stringify(arenaLayout),
    },
  });

  console.log('🏛️ Created Venues with interactive layouts.');

  // Helper to generate seats for an event
  const createSeatsForEvent = async (eventId: string, layout: any, pricing: any) => {
    const seatsData: any[] = [];
    for (const row of layout.rows) {
      const cat = row.category || 'STANDARD';
      const price = pricing[cat] || 25;
      for (let num = 1; num <= row.seatCount; num++) {
        seatsData.push({
          eventId,
          row: row.label,
          number: num,
          label: `${row.label}-${num}`,
          category: cat,
          price,
          status: 'AVAILABLE',
          version: 1,
        });
      }
    }
    await prisma.seat.createMany({ data: seatsData });
    return seatsData;
  };

  // 5. Create Events
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 30, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(20, 0, 0, 0);

  const event1Pricing = { VIP: 45.0, PREMIUM: 30.0, STANDARD: 18.0 };
  const event1 = await prisma.event.create({
    data: {
      title: 'Interstellar: 10th Anniversary IMAX 70mm Experience',
      description:
        'Witness Christopher Nolan’s space travel sci-fi masterpiece remastered in crystal-clear IMAX 70mm and Dolby Atmos audio immersion.',
      category: 'MOVIE',
      bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
      durationMinutes: 169,
      venueId: venue1.id,
      organiserId: organiser.id,
      showTime: tomorrow,
      status: 'PUBLISHED',
      tierPricing: JSON.stringify(event1Pricing),
      holdTtlMinutes: 10,
    },
  });
  await createSeatsForEvent(event1.id, imaxLayout, event1Pricing);

  const event2Pricing = { VIP: 120.0, PREMIUM: 75.0, STANDARD: 45.0 };
  const event2 = await prisma.event.create({
    data: {
      title: 'Coldplay: Music of the Spheres World Tour Live',
      description:
        'An unforgettable sensory spectacle featuring glowing LED wristbands, laser fireworks, and anthemic hits like Fix You and Yellow.',
      category: 'CONCERT',
      bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
      durationMinutes: 150,
      venueId: venue2.id,
      organiserId: organiser.id,
      showTime: nextWeek,
      status: 'PUBLISHED',
      tierPricing: JSON.stringify(event2Pricing),
      holdTtlMinutes: 10,
    },
  });
  await createSeatsForEvent(event2.id, arenaLayout, event2Pricing);

  // 6. Create High-Demand Sold-Out Event for instant Waitlist demo
  const tonight = new Date();
  tonight.setHours(21, 0, 0, 0);

  const soldOutPricing = { VIP: 90.0, PREMIUM: 60.0, STANDARD: 35.0 };
  const soldOutEvent = await prisma.event.create({
    data: {
      title: 'Dune: Part Two - Exclusive Director’s Cut Gala',
      description:
        'Exclusive premiere screening with red carpet access. High-demand event with full waitlist reallocation enabled.',
      category: 'MOVIE',
      bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      durationMinutes: 166,
      venueId: venue1.id,
      organiserId: organiser.id,
      showTime: tonight,
      status: 'SOLD_OUT',
      tierPricing: JSON.stringify(soldOutPricing),
      holdTtlMinutes: 10,
    },
  });
  await createSeatsForEvent(soldOutEvent.id, imaxLayout, soldOutPricing);

  // Mark all VIP seats as booked to demonstrate sold-out VIP category
  await prisma.seat.updateMany({
    where: { eventId: soldOutEvent.id },
    data: { status: 'BOOKED' },
  });

  // Create a sample booking on this sold out event so that customer can cancel it and trigger instant waitlist reallocation
  const vipSeats = await prisma.seat.findMany({
    where: { eventId: soldOutEvent.id, category: 'VIP' },
    take: 2,
  });

  const demoBooking = await prisma.booking.create({
    data: {
      bookingReference: 'TB-DEMO-VIP01',
      eventId: soldOutEvent.id,
      userId: customer1.id,
      customerName: customer1.name,
      customerEmail: customer1.email,
      totalAmount: 180.0,
      status: 'CONFIRMED',
      qrCodeData: JSON.stringify({ ref: 'TB-DEMO-VIP01', event: soldOutEvent.title, seats: ['A-1', 'A-2'] }),
      qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      items: {
        create: vipSeats.map((s) => ({
          seatId: s.id,
          seatLabel: s.label,
          category: s.category as any,
          price: s.price,
        })),
      },
    },
  });

  // Put customer2 on the waitlist for this VIP category so when user cancels demoBooking, customer2 gets the seat automatically!
  await prisma.waitlistEntry.create({
    data: {
      eventId: soldOutEvent.id,
      userId: customer2.id,
      category: 'VIP',
      status: 'WAITING',
      position: 1,
    },
  });

  console.log('⚡ Created High-Demand Event with pre-configured Waitlist and active booking for live cancellation demo.');
  console.log('✅ Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
