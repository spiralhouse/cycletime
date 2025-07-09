import fetch from 'node-fetch';
import { config } from '../config.js';

export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export class GitHubAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = config.githubClientId;
    this.clientSecret = config.githubClientSecret;
    this.redirectUri = config.githubRedirectUri;
  }

  /**
   * Generate GitHub OAuth URL
   */
  generateOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json() as GitHubTokenResponse;
    
    if (!data.access_token) {
      throw new Error('No access token received from GitHub');
    }

    return data.access_token;
  }

  /**
   * Fetch user profile from GitHub API
   */
  async fetchUserProfile(accessToken: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CycleTime-API-Gateway',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.statusText}`);
    }

    const user = await response.json() as GitHubUser;

    // Fetch user's primary email if not public
    if (!user.email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CycleTime-API-Gateway',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json() as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        
        const primaryEmail = emails.find(e => e.primary && e.verified);
        if (primaryEmail) {
          user.email = primaryEmail.email;
        }
      }
    }

    return user;
  }

  /**
   * Validate GitHub access token
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CycleTime-API-Gateway',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const githubAuthService = new GitHubAuthService();