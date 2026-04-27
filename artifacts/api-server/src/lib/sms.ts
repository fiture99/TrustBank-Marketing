import { logger } from "./logger";

export interface SmsResult {
  destination: string;
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface DataSlingResponse {
  response?: {
    status?: string;
    message?: string;
    messageid?: string;
  };
}

const RESPONSE_CODES: Record<string, string> = {
  "200": "Success",
  "1702": "Invalid URL or missing parameter",
  "1703": "Invalid username or password",
  "1704": "Invalid type parameter",
  "1705": "Invalid message",
  "1706": "Invalid destination",
  "1707": "Invalid sender ID",
  "1708": "Invalid dlr parameter",
  "1709": "User validation failed",
  "1710": "Internal error",
  "1025": "Insufficient credit",
  "1715": "Response timeout",
  "1032": "DND reject",
  "1028": "Spam message",
  "400": "Bad parameters",
  "405": "Sender ID not allowed",
  "406": "Destination not allowed",
  "408": "Invalid destination",
  "429": "Too many requests",
  "500": "Unknown error",
  "501": "Error sending message",
};

function smsConfig() {
  const username = process.env["DATASLING_SMS_USERNAME"];
  const password = process.env["DATASLING_SMS_PASSWORD"];
  const bearer = process.env["DATASLING_SMS_BEARER_TOKEN"];
  const sender = process.env["DATASLING_SMS_SENDER"] ?? "TrustBank";
  const baseUrl =
    process.env["DATASLING_SMS_BASE_URL"] ??
    "https://sms-api.datasling.gm/bulksms";

  return { username, password, bearer, sender, baseUrl };
}

export function isSmsConfigured(): boolean {
  const { username, password, bearer } = smsConfig();
  return Boolean(username && password && bearer);
}

export async function sendSms(
  destination: string,
  message: string,
): Promise<SmsResult> {
  const { username, password, bearer, sender, baseUrl } = smsConfig();

  if (!username || !password || !bearer) {
    return {
      destination,
      success: false,
      errorMessage:
        "SMS provider is not configured. Set DATASLING_SMS_* values in artifacts/api-server/.env",
    };
  }

  const cleanDest = destination.replace(/[^\d+]/g, "");
  const url = new URL(`${baseUrl}/send_sms`);
  url.searchParams.set("username", username);
  url.searchParams.set("password", password);
  url.searchParams.set("destination", cleanDest);
  url.searchParams.set("source", sender);
  url.searchParams.set("message", message);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    let parsed: DataSlingResponse = {};
    try {
      parsed = JSON.parse(text) as DataSlingResponse;
    } catch {
      // non-JSON response
    }

    const status = parsed.response?.status ?? String(res.status);
    const success = status === "200";

    if (!success) {
      logger.warn(
        { destination: cleanDest, status, body: text },
        "SMS send failed",
      );
    }

    return {
      destination: cleanDest,
      success,
      messageId: parsed.response?.messageid,
      errorCode: success ? undefined : status,
      errorMessage: success
        ? undefined
        : parsed.response?.message ?? RESPONSE_CODES[status] ?? `HTTP ${res.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, destination: cleanDest }, "SMS request threw");
    return {
      destination: cleanDest,
      success: false,
      errorMessage: message,
    };
  }
}

export async function sendBulkSms(
  destinations: string[],
  message: string,
): Promise<SmsResult[]> {
  const unique = Array.from(new Set(destinations.map((d) => d.trim()).filter(Boolean)));
  const results: SmsResult[] = [];
  // Sequential to be polite to the provider; small batches expected.
  for (const dest of unique) {
    results.push(await sendSms(dest, message));
  }
  return results;
}
