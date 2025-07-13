import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GitHubAuthService } from '../../services/github-auth';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const mockFetch = require('node-fetch') as jest.MockedFunction<typeof fetch>;

describe('GitHubAuthService', () => {
  let service: GitHubAuthService;

  beforeEach(() => {
    service = new GitHubAuthService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateOAuthUrl', () => {
    it('should generate correct OAuth URL with all parameters', () => {
      const state = 'test_state_value';
      const url = service.generateOAuthUrl(state);

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('scope=user%3Aemail');
      expect(url).toContain(`state=${state}`);
    });

    it('should handle special characters in state parameter', () => {
      const state = 'test+state&with=special/chars';
      const url = service.generateOAuthUrl(state);

      expect(url).toContain(`state=${encodeURIComponent(state)}`);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should successfully exchange code for access token', async () => {
      const mockResponse = {
        access_token: 'github_access_token_123',
        token_type: 'bearer',
        scope: 'user:email',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const token = await service.exchangeCodeForToken('test_code');

      expect(token).toBe('github_access_token_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        {
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
        }
      );
    });

    it('should throw error when GitHub returns error response', async () => {
      const mockErrorResponse = {
        error: 'invalid_grant',
        error_description: 'The provided authorization grant is invalid',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(service.exchangeCodeForToken('invalid_code')).rejects.toThrow(
        'No access token received from GitHub'
      );
    });

    it('should throw error when GitHub API returns non-200 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(service.exchangeCodeForToken('test_code')).rejects.toThrow(
        'GitHub OAuth token exchange failed: Bad Request'
      );
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.exchangeCodeForToken('test_code')).rejects.toThrow(
        'Network error'
      );
    });

    it('should throw error when response is missing access_token', async () => {
      const mockResponse = {
        token_type: 'bearer',
        scope: 'user:email',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(service.exchangeCodeForToken('test_code')).rejects.toThrow(
        'No access token received from GitHub'
      );
    });
  });

  describe('fetchUserProfile', () => {
    it('should successfully fetch user profile with email', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/testuser.avatar',
        html_url: 'https://github.com/testuser'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUserResponse),
      });

      const profile = await service.fetchUserProfile('github_token_123');

      expect(profile).toEqual(mockUserResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        {
          headers: {
            'Authorization': 'Bearer github_token_123',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CycleTime-API-Gateway',
          },
        }
      );
    });

    it('should fetch emails when user profile email is null', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://github.com/testuser.avatar',
        html_url: 'https://github.com/testuser'
      };

      const mockEmailsResponse = [
        { email: 'test@example.com', primary: true, verified: true },
        { email: 'secondary@example.com', primary: false, verified: true },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUserResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockEmailsResponse),
        });

      const profile = await service.fetchUserProfile('github_token_123');

      expect(profile.email).toBe('test@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when user profile request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(service.fetchUserProfile('invalid_token')).rejects.toThrow(
        'GitHub API request failed: Unauthorized'
      );
    });

    it('should return user profile even with missing optional fields', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        html_url: 'https://github.com/testuser'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUserResponse),
      });

      const profile = await service.fetchUserProfile('github_token_123');
      expect(profile).toEqual(mockUserResponse);
    });

    it('should return user profile with null email when no primary email found', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://github.com/testuser.avatar',
        html_url: 'https://github.com/testuser'
      };

      const mockEmailsResponse = [
        { email: 'secondary@example.com', primary: false, verified: true },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUserResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockEmailsResponse),
        });

      const profile = await service.fetchUserProfile('github_token_123');
      expect(profile.email).toBe(null);
    });

    it('should handle network error when fetching user profile', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.fetchUserProfile('github_token_123')).rejects.toThrow(
        'Network error'
      );
    });
  });
});