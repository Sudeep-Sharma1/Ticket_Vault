import { prisma } from '../src/config/prisma';
import { holdService } from '../src/services/holdService';

async function testConcurrency() {
  console.log('🧪 Starting Concurrency Protection Stress Test...');

  // 1. Find or create 10 valid test users
  const concurrentCount = 10;
  const users = [];
  for (let i = 1; i <= concurrentCount; i++) {
    const email = `testuser${i}@concurrency-test.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Tester ${i}`,
        passwordHash: 'dummy',
        role: 'CUSTOMER',
      },
    });
    users.push(user);
  }

  // 2. Find an available seat
  const seat = await prisma.seat.findFirst({
    where: { status: 'AVAILABLE' },
    include: { event: true },
  });

  if (!seat) {
    console.error('❌ No available seats found for concurrency testing.');
    process.exit(1);
  }

  console.log(`🎯 Target Seat: ${seat.label} (Event: "${seat.event.title}", Seat ID: ${seat.id})`);
  console.log(`⚡ Dispatching ${concurrentCount} simultaneous hold requests for Seat ${seat.label}...`);

  const results = await Promise.allSettled(
    users.map(async (user) => {
      return holdService.holdSeats(seat.eventId, [seat.id], user.id);
    })
  );

  let successCount = 0;
  let conflictCount = 0;
  let winner = '';

  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      successCount++;
      winner = users[idx].email;
      console.log(`  [${users[idx].email}] ✅ SUCCESS: Hold granted! (Token: ${res.value.holdToken.slice(0, 8)}...)`);
    } else {
      conflictCount++;
      console.log(`  [${users[idx].email}] 🛡️ CONFLICT REJECTED (409): ${res.reason.message}`);
    }
  });

  console.log('\n📊 Concurrency Protection Test Summary:');
  console.log(`  • Total Simultaneous Attempts: ${concurrentCount}`);
  console.log(`  • Successful Holds: ${successCount}`);
  console.log(`  • Rejected Conflicts: ${conflictCount}`);
  console.log(`  • Winning Customer: ${winner}`);

  if (successCount === 1 && conflictCount === concurrentCount - 1) {
    console.log('\n🎉 PASS: Strict concurrency protection verified! Exactly 1 winner, 0 double-bookings.');
  } else {
    console.error(`\n❌ FAIL: Expected 1 winner, got ${successCount}`);
    process.exit(1);
  }

  // Cleanup the test hold
  await prisma.seatHold.deleteMany({ where: { seatId: seat.id } });
  await prisma.seat.update({ where: { id: seat.id }, data: { status: 'AVAILABLE' } });
  console.log('🧹 Cleaned up test hold state. Database restored.');
}

testConcurrency()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
