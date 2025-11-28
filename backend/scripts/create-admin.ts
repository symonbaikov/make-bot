#!/usr/bin/env tsx
/**
 * Quick script to create admin user in production
 * Usage: tsx scripts/create-admin.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  console.log('Creating admin user...');
  console.log(`Email: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.webUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Admin user created/updated successfully!');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

