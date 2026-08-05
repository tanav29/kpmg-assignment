export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

export async function readJson(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new InvalidRequestError("Request body must be a JSON object.");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InvalidRequestError) throw error;
    throw new InvalidRequestError("Request body must contain valid JSON.");
  }
}

export function text(value: unknown): value is string {
  return typeof value === "string";
}

export function trimmedText(value: unknown): string | null {
  return text(value) && value.trim() ? value.trim() : null;
}
