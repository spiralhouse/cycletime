import { PrismaClient } from '@prisma/client';
import { GitHubUser } from './github-auth.js';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  githubUsername: string;
  avatarUrl: string;
  githubId: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create or update user from GitHub profile
   */
  async createOrUpdateUser(githubUser: GitHubUser): Promise<UserProfile> {
    const user = await this.prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        email: githubUser.email,
        name: githubUser.name || githubUser.login,
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        lastActiveAt: new Date(),
      },
      create: {
        email: githubUser.email,
        name: githubUser.name || githubUser.login,
        githubUsername: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        githubId: githubUser.id,
        lastActiveAt: new Date(),
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
      githubId: user.githubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
      githubId: user.githubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by GitHub username
   */
  async getUserByGithubUsername(githubUsername: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { githubUsername },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
      githubId: user.githubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(id: string, updates: Partial<Pick<UserProfile, 'name' | 'email'>>): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      githubUsername: user.githubUsername,
      avatarUrl: user.avatarUrl,
      githubId: user.githubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user last active timestamp
   */
  async updateLastActive(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Delete user account
   */
  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}

export const createUserService = (prisma: PrismaClient) => new UserService(prisma);