/**
 * n8n Webhook Client
 *
 * All backend logic is handled by n8n workflows.
 * This module provides a typed wrapper for calling n8n webhook endpoints.
 */

export class N8nError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "N8nError";
  }
}

/**
 * Call an n8n webhook endpoint with a typed payload.
 *
 * @param endpoint - Full webhook URL or relative path (combined with N8N_WEBHOOK_BASE_URL)
 * @param payload  - JSON body to send
 * @returns Parsed JSON response from n8n
 */
export async function callN8nWebhook<TResponse = unknown>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<TResponse> {
  let url: string;

  if (endpoint.startsWith("http")) {
    url = endpoint;
  } else {
    const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL;
    if (!N8N_BASE_URL) {
      throw new N8nError(
        "N8N_WEBHOOK_BASE_URL environment variable is not set."
      );
    }
    url = `${N8N_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.N8N_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new N8nError(
      `n8n webhook call failed: ${response.statusText}`,
      response.status
    );
  }

  const text = await response.text();
  if (!text) {
    throw new N8nError("n8n webhook returned empty response");
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new N8nError(`n8n webhook returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
