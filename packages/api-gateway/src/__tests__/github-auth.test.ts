import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GitHubAuthService } from '../services/github-auth';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubAuthService', () => {
  let service: GitHubAuthService;

  beforeEach(() => {
    // Mock config
    jest.mock('../config.js', () => ({
      config: {
        githubClientId: 'test_client_id',
        githubClientSecret: 'test_client_secret',
        githubRedirectUri: 'http://localhost:3000/auth/callback',
      },
    }));

    service = new GitHubAuthService();
    jest.clearAllMocks();
  });

  describe('generateOAuthUrl', () => {
    it('should generate correct OAuth URL', () => {
      const state = 'test_state';
      const url = service.generateOAuthUrl(state);

      expect(url).toContain('github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('scope=user%3Aemail');
      expect(url).toContain('state=test_state');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for access token', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          access_token: 'github_access_token',
          token_type: 'bearer',
          scope: 'user:email',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const token = await service.exchangeCodeForToken('test_code');

      expect(token).toBe('github_access_token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            code: 'test_code',
            redirect_uri: 'http://localhost:3000/auth/callback',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(service.exchangeCodeForToken('invalid_code')).rejects.toThrow(
        'GitHub OAuth token exchange failed: Bad Request'
      );
    });

    it('should handle missing access token', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The provided authorization grant is invalid',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(service.exchangeCodeForToken('invalid_code')).rejects.toThrow(
        'No access token received from GitHub'
      );
    });
  });

  describe('fetchUserProfile', () => {
    it('should fetch user profile with public email', async () => {
      const mockUser = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser',
      };

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockUser),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const user = await service.fetchUserProfile('access_token');

      expect(user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer access_token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CycleTime-API-Gateway',
          },
        })
      );
    });

    it('should fetch user profile and primary email when email is null', async () => {
      const mockUser = {
        id: 12345,
        login: 'testuser',
        email: null,
        name: 'Test User',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser',
      };

      const mockEmails = [
        { email: 'backup@example.com', primary: false, verified: true },
        { email: 'primary@example.com', primary: true, verified: true },
      ];

      const mockUserResponse = {
        ok: true,
        json: () => Promise.resolve(mockUser),
      };

      const mockEmailResponse = {
        ok: true,
        json: () => Promise.resolve(mockEmails),
      };

      mockFetch
        .mockResolvedValueOnce(mockUserResponse as any)
        .mockResolvedValueOnce(mockEmailResponse as any);

      const user = await service.fetchUserProfile('access_token');

      expect(user.email).toBe('primary@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/user/emails',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer access_token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CycleTime-API-Gateway',
          },
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(service.fetchUserProfile('invalid_token')).rejects.toThrow(
        'GitHub API request failed: Unauthorized'
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should return true for valid token', async () => {
      const mockResponse = {
        ok: true,
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const isValid = await service.validateAccessToken('valid_token');

      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const mockResponse = {
        ok: false,
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const isValid = await service.validateAccessToken('invalid_token');

      expect(isValid).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const isValid = await service.validateAccessToken('any_token');

      expect(isValid).toBe(false);
    });
  });
});