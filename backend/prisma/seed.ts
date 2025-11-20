import { PrismaClient, Plan, SessionStatus, ActionType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.webUser.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create test session (use upsert to avoid duplicate errors)
  const session = await prisma.session.upsert({
    where: { sessionId: 'test-session-001' },
    update: {},
    create: {
      sessionId: 'test-session-001',
      plan: Plan.STANDARD,
      amount: 99.99,
      currency: 'USD',
      status: SessionStatus.STARTED,
    },
  });

  console.log('Created/updated test session:', session.sessionId);

  // Create test action (only if doesn't exist)
  const existingAction = await prisma.action.findFirst({
    where: {
      ref: session.sessionId,
      type: ActionType.SESSION_CREATED,
    },
  });

  if (!existingAction) {
    await prisma.action.create({
      data: {
        type: ActionType.SESSION_CREATED,
        ref: session.sessionId,
        sessionId: session.id,
        payload: {
          source: 'seed',
          test: true,
        },
      },
    });
    console.log('Created test action');
  } else {
    console.log('Test action already exists, skipping');
  }

  console.log('Seeding completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
