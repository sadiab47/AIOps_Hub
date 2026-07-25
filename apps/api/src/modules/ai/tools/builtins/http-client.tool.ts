import { AgentTool, ToolDefinition } from '../interfaces/tool.interface';

export class HttpClientTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: 'http_client',
    description: 'Perform sandboxed HTTP GET or POST requests to allow-listed domains.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'The HTTP method.',
        },
        url: {
          type: 'string',
          format: 'uri',
          description: 'The request destination URL. Must be in the domain allow-list.',
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP request headers dictionary.',
          additionalProperties: { type: 'string' },
        },
        body: {
          type: 'string',
          description: 'Optional stringified request payload.',
        },
      },
      required: ['method', 'url'],
      additionalProperties: false,
    },
  };

  private readonly allowedDomains = [
    'api.github.com',
    'api.weather.gov',
    'httpbin.org',
    'localhost:3001',
  ];

  async execute(input: {
    method: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; headers: Record<string, string>; data: any }> {
    const { method, url, headers = {}, body } = input;

    // Validate domain allowlist
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (err: any) {
      throw new Error(`Invalid URL parameter: ${url}`);
    }

    const host = parsedUrl.host.toLowerCase();
    const isAllowed = this.allowedDomains.some(domain => host === domain || host.endsWith('.' + domain));

    if (!isAllowed) {
      throw new Error(`Access Denied: Domain '${host}' is not in the allow-list.`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s execution timeout

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method === 'POST' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      let responseData: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        status: response.status,
        headers: responseHeaders,
        data: responseData,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('HTTP request timed out after 10 seconds.');
      }
      throw new Error(`HTTP request failed: ${err.message}`);
    }
  }
}
