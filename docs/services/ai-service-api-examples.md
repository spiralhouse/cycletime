# AI Service API Usage Examples

## Authentication Setup

All requests require Bearer token authentication. Set up your HTTP client:

### JavaScript/TypeScript
```typescript
const API_BASE = 'http://localhost:8003/api/v1';
const authHeaders = {
  'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN}`,
  'Content-Type': 'application/json'
};
```

### Python
```python
import requests

API_BASE = "http://localhost:8003/api/v1"
headers = {
    "Authorization": f"Bearer {os.environ['AI_SERVICE_TOKEN']}",
    "Content-Type": "application/json"
}
```

### cURL
```bash
export AI_TOKEN="your-token-here"
export API_BASE="http://localhost:8003/api/v1"

curl -H "Authorization: Bearer $AI_TOKEN" \
     -H "Content-Type: application/json" \
     "$API_BASE/ai/health"
```

## Common Integration Patterns

### 1. Creating an AI Request

#### Chat Completion Request
```typescript
async function createChatRequest(messages: Array<{role: string, content: string}>) {
  const response = await fetch(`${API_BASE}/ai/requests`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'chat_completion',
      messages: messages,
      maxTokens: 1000,
      temperature: 0.7,
      provider: 'claude' // optional, will auto-select if omitted
    })
  });
  
  const request = await response.json();
  return request.id; // Use this to track the request
}

// Usage
const requestId = await createChatRequest([
  { role: 'user', content: 'Analyze this code for potential improvements' }
]);
```

#### Project Analysis Request
```typescript
async function createProjectAnalysis(projectId: string) {
  const response = await fetch(`${API_BASE}/ai/requests`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'project_analysis',
      projectId: projectId,
      analysisType: 'full',
      includeRecommendations: true
    })
  });
  
  return response.json();
}
```

#### Embedding Generation Request
```typescript
async function createEmbedding(text: string[]) {
  const response = await fetch(`${API_BASE}/ai/requests`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'embedding',
      input: text,
      model: 'text-embedding-3-small'
    })
  });
  
  return response.json();
}
```

### 2. Tracking Request Status

```typescript
async function pollRequestStatus(requestId: string): Promise<any> {
  while (true) {
    const response = await fetch(`${API_BASE}/ai/requests/${requestId}/status`, {
      headers: authHeaders
    });
    
    const status = await response.json();
    
    if (status.status === 'completed') {
      // Get the response
      const responseData = await fetch(`${API_BASE}/ai/requests/${requestId}/response`, {
        headers: authHeaders
      });
      return responseData.json();
    }
    
    if (status.status === 'failed') {
      throw new Error(`AI request failed: ${status.error}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### 3. Provider Management

#### List Available Providers
```typescript
async function getProviders() {
  const response = await fetch(`${API_BASE}/ai/providers`, {
    headers: authHeaders
  });
  
  const data = await response.json();
  return data.providers;
}

// Example response:
// {
//   "providers": [
//     {
//       "id": "claude",
//       "name": "Anthropic Claude",
//       "status": "healthy",
//       "capabilities": ["chat", "analysis"],
//       "costPer1kTokens": 0.008
//     }
//   ]
// }
```

#### Check Provider Health
```typescript
async function checkProviderHealth(providerId: string) {
  const response = await fetch(`${API_BASE}/ai/providers/${providerId}/health`, {
    method: 'POST',
    headers: authHeaders
  });
  
  return response.json();
}
```

### 4. Usage Analytics

#### Get Usage Statistics
```typescript
async function getUsageStats(timeRange: string = '24h') {
  const response = await fetch(`${API_BASE}/ai/usage?timeRange=${timeRange}`, {
    headers: authHeaders
  });
  
  return response.json();
}

// Example response:
// {
//   "timeRange": "24h",
//   "totalRequests": 145,
//   "totalTokens": 89234,
//   "totalCost": 2.45,
//   "byProvider": {
//     "claude": { "requests": 120, "tokens": 75000, "cost": 2.10 },
//     "openai": { "requests": 25, "tokens": 14234, "cost": 0.35 }
//   }
// }
```

#### Cost Analysis
```typescript
async function getCostAnalysis(providerId?: string) {
  const url = providerId 
    ? `${API_BASE}/ai/usage/${providerId}` 
    : `${API_BASE}/ai/usage/costs`;
    
  const response = await fetch(url, { headers: authHeaders });
  return response.json();
}
```

## Error Handling Examples

### Basic Error Handling
```typescript
async function makeAIRequest(requestData: any) {
  try {
    const response = await fetch(`${API_BASE}/ai/requests`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 400:
          throw new Error(`Invalid request: ${error.message}`);
        case 401:
          throw new Error('Authentication failed');
        case 429:
          throw new Error(`Rate limited. Retry after: ${response.headers.get('Retry-After')}s`);
        case 500:
          throw new Error(`Service error: ${error.message}`);
        default:
          throw new Error(`Unexpected error: ${error.message}`);
      }
    }
    
    return response.json();
  } catch (error) {
    console.error('AI Service request failed:', error);
    throw error;
  }
}
```

### Retry Logic with Exponential Backoff
```typescript
async function makeRequestWithRetry(requestData: any, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await makeAIRequest(requestData);
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      
      // Only retry on rate limits or server errors
      if (error.message.includes('Rate limited') || error.message.includes('Service error')) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Don't retry client errors
    }
  }
}
```

## Complete Example: Context Analysis Workflow

```typescript
class AIServiceClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(token: string, baseUrl: string = 'http://localhost:8003/api/v1') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async analyzeProjectContext(projectId: string, documents: any[]): Promise<any> {
    // 1. Create context analysis request
    const request = await this.createRequest({
      type: 'context_analysis',
      projectId,
      documents,
      analysisType: 'incremental'
    });
    
    console.log(`Started context analysis: ${request.id}`);
    
    // 2. Poll for completion
    const result = await this.waitForCompletion(request.id);
    
    // 3. Return analyzed context
    return result;
  }
  
  private async createRequest(data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/requests`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  private async waitForCompletion(requestId: string): Promise<any> {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const status = await this.getRequestStatus(requestId);
      
      if (status.status === 'completed') {
        return this.getRequestResponse(requestId);
      }
      
      if (status.status === 'failed') {
        throw new Error(`Analysis failed: ${status.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Analysis timed out');
  }
  
  private async getRequestStatus(requestId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/requests/${requestId}/status`, {
      headers: this.headers
    });
    return response.json();
  }
  
  private async getRequestResponse(requestId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai/requests/${requestId}/response`, {
      headers: this.headers
    });
    return response.json();
  }
}

// Usage
const aiClient = new AIServiceClient(process.env.AI_SERVICE_TOKEN!);

const result = await aiClient.analyzeProjectContext('project-123', [
  {
    id: 'doc-1',
    content: 'Project documentation content...',
    title: 'Project Overview',
    type: 'markdown'
  }
]);

console.log('Analysis complete:', result);
```

## Service Health Monitoring

```typescript
async function monitorServiceHealth() {
  const response = await fetch(`${API_BASE}/ai/health`, {
    headers: authHeaders
  });
  
  const health = await response.json();
  
  if (health.status !== 'healthy') {
    console.warn('AI Service health warning:', health);
    
    // Check individual components
    if (health.components) {
      for (const [component, status] of Object.entries(health.components)) {
        if (status !== 'healthy') {
          console.error(`Component ${component} is ${status}`);
        }
      }
    }
  }
  
  return health;
}
```

This covers the most common integration patterns. For event-driven integration, see the [Event Integration Guide](./ai-service-events.md).