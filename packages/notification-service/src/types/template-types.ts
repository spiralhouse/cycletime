export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  category: string;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface TemplatePreview {
  subject: string;
  content: string;
  variables: string[];
  missingVariables: string[];
}