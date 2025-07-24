export interface UserPreferences {
  userId: string;
  channels: {
    email: ChannelPreferences;
    sms: ChannelPreferences;
    push: ChannelPreferences;
    in_app: ChannelPreferences;
  };
  categories: Record<string, boolean>;
  timezone: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelPreferences {
  enabled: boolean;
  address: string;
  verified: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}