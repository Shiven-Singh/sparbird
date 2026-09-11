/** Phone number handling. Numbers are validated as E.164 and never printed in full. */

const E164 = /^\+[1-9]\d{7,14}$/;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function isE164(value: string): boolean {
  return E164.test(value.trim());
}

/**
 * Renders a number for display: country code, dots, last four digits.
 * `+14155550123` becomes `+1 •••• ••0123`.
 */
export function maskPhone(value: string): string {
  const raw = value.trim();
  if (raw.length < 5) return "•••••";
  const last4 = raw.slice(-4);
  const head = raw.startsWith("+") ? raw.slice(0, 3) : "";
  return `${head} •••• ••${last4}`.trim();
}

/**
 * The one number Sparbird is allowed to dial. Throws rather than defaulting,
 * because a wrong default here would mean calling a stranger.
 */
export function resolveOwnerNumber(): string {
  const raw = process.env.OWNER_E164?.trim();
  if (!raw) {
    throw new ConfigError(
      "OWNER_E164 is not set. Sparbird only ever dials your own number, so it needs to know it. " +
        "Set it in .env to your phone in E.164 form, for example +14155550123.",
    );
  }
  if (!isE164(raw)) {
    throw new ConfigError(
      `OWNER_E164 is not a valid E.164 number: ${maskPhone(raw)}. ` +
        "Use a leading plus, country code, and no spaces or dashes.",
    );
  }
  return raw;
}

/** Redacts anything that looks like a phone number in free text before it is stored or logged. */
export function redactNumbers(text: string): string {
  return text.replace(/\+?\d[\d\s\-().]{7,}\d/g, (match) => maskPhone(match.replace(/[\s\-().]/g, "")));
}
