import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../../services/user';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe('UserService Basic Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://avatar.url',
        githubId: 12345,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastActiveAt: new Date('2024-01-01'),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('user_123');

      expect(result).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://avatar.url',
        githubId: 12345,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
      });
    });

    it('should return null when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const mockUpdatedUser = {
        id: 'user_123',
        email: 'updated@example.com',
        name: 'Updated Name',
        githubUsername: 'testuser',
        avatarUrl: 'https://avatar.url',
        githubId: 12345,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastActiveAt: new Date('2024-01-01'),
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUserProfile('user_123', {
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          name: 'Updated Name',
          email: 'updated@example.com',
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});