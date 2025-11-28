#!/usr/bin/env tsx
/**
 * Script to verify admin user exists and fix password if needed
 * Usage: tsx scripts/verify-and-fix-admin.ts
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const password = 'admin123';

  console.log('🔍 Checking admin user...');
  console.log(`Email: ${email}`);
  console.log('');

  // Check if user exists
  const existingUser = await prisma.webUser.findUnique({
    where: { email },
  });

  if (!existingUser) {
    console.log('❌ User not found! Creating new admin user...');
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const admin = await prisma.webUser.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Password: ${password}`);
  } else {
    console.log('✅ User found!');
    console.log(`   ID: ${existingUser.id}`);
    console.log(`   Email: ${existingUser.email}`);
    console.log(`   Role: ${existingUser.role}`);
    console.log('');

    // Verify password
    console.log('🔐 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash);
    
    if (!isValidPassword) {
      console.log('⚠️  Password mismatch! Updating password...');
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      await prisma.webUser.update({
        where: { email },
        data: { passwordHash },
      });
      
      console.log('✅ Password updated successfully!');
      console.log(`   New password: ${password}`);
    } else {
      console.log('✅ Password is correct!');
    }
  }

  console.log('');
  console.log('📋 Login credentials:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

