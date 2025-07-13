import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GitHubAuthService } from '../../services/github-auth';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('GitHubAuthService', () => {
  let service: GitHubAuthService;
  const mockConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/auth/callback',
  };

  beforeEach(() => {
    service = new GitHubAuthService(mockConfig.clientId, mockConfig.clientSecret, mockConfig.redirectUri);
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
      expect(url).toContain(`client_id=${mockConfig.clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain('scope=user%3Aemail');
      expect(url).toContain(`state=${state}`);
    });

    it('should handle special characters in state parameter', () => {
      const state = 'test+state&with=special/chars';
      const url = service.generateOAuthUrl(state);

      expect(url).toContain(`state=${state}`);
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
            client_id: mockConfig.clientId,
            client_secret: mockConfig.clientSecret,
            code: 'test_code',
            redirect_uri: mockConfig.redirectUri,
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
        'GitHub OAuth error: invalid_grant - The provided authorization grant is invalid'
      );
    });

    it('should throw error when GitHub API returns non-200 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(service.exchangeCodeForToken('test_code')).rejects.toThrow(
        'GitHub OAuth request failed: 400 Bad Request'
      );
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.exchangeCodeForToken('test_code')).rejects.toThrow(
        'Failed to exchange code for token: Network error'
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

      expect(profile).toEqual({
        githubId: 12345,
        githubUsername: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      });

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

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user/emails',
        {
          headers: {
            'Authorization': 'Bearer github_token_123',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CycleTime-API-Gateway',
          },
        }
      );
    });

    it('should use email from user profile if no emails endpoint data', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUserResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      const profile = await service.fetchUserProfile('github_token_123');

      expect(profile).toEqual({
        githubId: 12345,
        githubUsername: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('should throw error when user profile request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(service.fetchUserProfile('invalid_token')).rejects.toThrow(
        'Failed to fetch GitHub user profile: 401 Unauthorized'
      );
    });

    it('should throw error when user profile is missing required fields', async () => {
      const mockUserResponse = {
        login: 'testuser',
        name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUserResponse),
      });

      await expect(service.fetchUserProfile('github_token_123')).rejects.toThrow(
        'GitHub user profile missing required fields'
      );
    });

    it('should throw error when no primary email found', async () => {
      const mockUserResponse = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
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

      await expect(service.fetchUserProfile('github_token_123')).rejects.toThrow(
        'No primary email found in GitHub profile'
      );
    });

    it('should handle network error when fetching user profile', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.fetchUserProfile('github_token_123')).rejects.toThrow(
        'Failed to fetch GitHub user profile: Network error'
      );
    });
  });
});