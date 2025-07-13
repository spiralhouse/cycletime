import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../../services/user.js';
import type { GitHubUser } from '../../services/github-auth.js';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createOrUpdateUser', () => {
    const mockGitHubUser: GitHubUser = {
      id: 12345,
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar/testuser',
      html_url: 'https://github.com/testuser',
    };

    it('should create or update user via upsert', async () => {
      const upsertedUser = {
        id: 'user_123',
        email: 'test@example.com',
        githubId: 12345,
        githubUsername: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/avatar/testuser',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.upsert as jest.Mock).mockResolvedValue(upsertedUser);

      const result = await userService.createOrUpdateUser(mockGitHubUser);

      expect(result).toEqual({
        id: upsertedUser.id,
        email: upsertedUser.email,
        name: upsertedUser.name,
        githubUsername: upsertedUser.githubUsername,
        avatarUrl: upsertedUser.avatarUrl,
        githubId: upsertedUser.githubId,
        createdAt: upsertedUser.createdAt,
        updatedAt: upsertedUser.updatedAt,
      });

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { githubId: 12345 },
        update: {
          email: 'test@example.com',
          name: 'Test User',
          githubUsername: 'testuser',
          avatarUrl: 'https://github.com/avatar/testuser',
          lastActiveAt: expect.any(Date),
        },
        create: {
          email: 'test@example.com',
          name: 'Test User',
          githubUsername: 'testuser',
          avatarUrl: 'https://github.com/avatar/testuser',
          githubId: 12345,
          lastActiveAt: expect.any(Date),
        },
      });
    });

    it('should handle GitHub user with null name', async () => {
      const githubUserWithoutName: GitHubUser = {
        ...mockGitHubUser,
        name: null as any,
      };

      const upsertedUser = {
        id: 'user_123',
        email: 'test@example.com',
        githubId: 12345,
        githubUsername: 'testuser',
        name: 'testuser', // Should use login as fallback
        avatarUrl: 'https://github.com/avatar/testuser',
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.upsert as jest.Mock).mockResolvedValue(upsertedUser);

      const result = await userService.createOrUpdateUser(githubUserWithoutName);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { githubId: 12345 },
        update: {
          email: 'test@example.com',
          name: 'testuser', // Fallback to login
          githubUsername: 'testuser',
          avatarUrl: 'https://github.com/avatar/testuser',
          lastActiveAt: expect.any(Date),
        },
        create: {
          email: 'test@example.com',
          name: 'testuser', // Fallback to login
          githubUsername: 'testuser',
          avatarUrl: 'https://github.com/avatar/testuser',
          githubId: 12345,
          lastActiveAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar/testuser',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('user_123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        githubUsername: mockUser.githubUsername,
        avatarUrl: mockUser.avatarUrl,
        githubId: mockUser.githubId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
      });
    });

    it('should return null when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('getUserByGithubUsername', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar/testuser',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserByGithubUsername('testuser');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        githubUsername: mockUser.githubUsername,
        avatarUrl: mockUser.avatarUrl,
        githubId: mockUser.githubId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { githubUsername: 'testuser' },
      });
    });

    it('should return null when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserByGithubUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const mockUpdatedUser = {
        id: 'user_123',
        email: 'newemail@example.com',
        name: 'New Name',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar/testuser',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUserProfile('user_123', {
        email: 'newemail@example.com',
        name: 'New Name',
      });

      expect(result).toEqual({
        id: mockUpdatedUser.id,
        email: mockUpdatedUser.email,
        name: mockUpdatedUser.name,
        githubUsername: mockUpdatedUser.githubUsername,
        avatarUrl: mockUpdatedUser.avatarUrl,
        githubId: mockUpdatedUser.githubId,
        createdAt: mockUpdatedUser.createdAt,
        updatedAt: mockUpdatedUser.updatedAt,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          email: 'newemail@example.com',
          name: 'New Name',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      await userService.updateLastActive('user_123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { lastActiveAt: expect.any(Date) },
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      await userService.deleteUser('user_123');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user_123' },
      });
    });
  });
});