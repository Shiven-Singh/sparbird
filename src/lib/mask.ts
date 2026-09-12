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
 * The number this call is allowed to ring, and the only one.
 *
 * `OWNER_E164` is a lock, not a default: where it is set, that phone is the only phone this
 * install will ever dial, whoever is signed in. That is how the public demo stays harmless.
 * Where it is not set, the number saved on the signed-in account is used, and an account with
 * no number cannot place a call at all.
 */
export function resolveDialNumber(accountPhone: string | null | undefined): string {
  const locked = process.env.OWNER_E164?.trim();
  if (locked) return resolveOwnerNumber();

  const raw = accountPhone?.trim();
  if (!raw) {
    throw new ConfigError(
      "There is no phone number on this account yet. Sparbird rings your own phone and nobody " +
        "else's, so it needs to know which one. Add it under Settings.",
    );
  }
  if (!isE164(raw)) {
    throw new ConfigError(
      `The number on this account is not a valid E.164 number: ${maskPhone(raw)}. ` +
        "Use a leading plus, country code, and no spaces or dashes.",
    );
  }
  return raw;
}

/**
 * The install-wide lock, when there is one. Throws rather than defaulting,
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

/**
 * Country codes, longest first so +971 wins over +97 and +1 is the last resort.
 * Not exhaustive: an unknown number keeps whatever region the persona carries.
 */
const DIALLING: Array<[string, string]> = [
  ["880", "BD"], ["852", "HK"], ["971", "AE"], ["977", "NP"], ["353", "IE"],
  ["91", "IN"], ["92", "PK"], ["94", "LK"], ["44", "GB"], ["61", "AU"],
  ["49", "DE"], ["33", "FR"], ["81", "JP"], ["65", "SG"], ["27", "ZA"],
  ["55", "BR"], ["52", "MX"], ["64", "NZ"], ["31", "NL"], ["34", "ES"],
  ["39", "IT"], ["46", "SE"], ["47", "NO"], ["45", "DK"], ["48", "PL"],
  ["90", "TR"], ["86", "CN"], ["82", "KR"], ["60", "MY"], ["62", "ID"],
  ["63", "PH"], ["66", "TH"], ["84", "VN"], ["7", "RU"], ["1", "US"],
];

/**
 * The country a number belongs to, for the routing hint CALL-E uses to pick a line.
 *
 * This has to follow the destination, not the persona. An American investor calling an Indian
 * phone is still a call into India, and telling the carrier otherwise earns a 404 and no ring.
 * The persona's `locale` is untouched: that is how they sound, and it should stay American if
 * that is who they are.
 */
export function regionForNumber(e164: string): string | null {
  const digits = e164.trim().replace(/^\+/, "");
  for (const [code, region] of DIALLING) {
    if (digits.startsWith(code)) return region;
  }
  return null;
}

/** Redacts anything that looks like a phone number in free text before it is stored or logged. */
export function redactNumbers(text: string): string {
  return text.replace(/\+?\d[\d\s\-().]{7,}\d/g, (match) => maskPhone(match.replace(/[\s\-().]/g, "")));
}
