import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export class UserService {
  async findByEmail(email: string): Promise<Prisma.UserGetPayload<Record<string, never>> | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findByTgUserId(tgUserId: string): Promise<Prisma.UserGetPayload<Record<string, never>> | null> {
    return prisma.user.findUnique({
      where: { tgUserId },
    });
  }

  async findById(id: string): Promise<Prisma.UserGetPayload<{
    include: {
      sessions: true;
    };
  }> | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        sessions: true,
      },
    });
  }

  async create(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    tgUserId?: string;
  }): Promise<Prisma.UserGetPayload<Record<string, never>>> {
    return prisma.user.create({
      data,
    });
  }

  async upsertByTgUserId(data: {
    tgUserId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<Prisma.UserGetPayload<Record<string, never>>> {
    return prisma.user.upsert({
      where: { tgUserId: data.tgUserId },
      update: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
      },
      create: data,
    });
  }

  async update(id: string, data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<Prisma.UserGetPayload<Record<string, never>>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

export const userService = new UserService();

