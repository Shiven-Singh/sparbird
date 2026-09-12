/**
 * Loads .env for the command-line tools.
 *
 * Next.js reads .env by itself, so the app has always seen these. A script run through tsx does
 * not, which meant `pnpm drill` read neither SPARBIRD_LIVE nor OWNER_E164 and quietly replayed a
 * recorded call while reporting "dry run" to somebody who had asked for a real one.
 *
 * Import this before anything that reads the environment. The dry run deliberately does not:
 * it is defined by running from fixtures whatever your .env says.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), ".env");

if (existsSync(path)) {
  try {
    process.loadEnvFile(path);
  } catch {
    // A malformed .env should not stop you seeing a persona. Anything missing is reported
    // later, by name, at the point it is needed.
  }
}
