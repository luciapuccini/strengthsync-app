import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { verify } from "../lib/password.ts";

// Must match the password documented in db/seeds/003_demo_credentials.sql.
const DEMO_PASSWORD = "dev-password-123";

const DEMO_CREDENTIALS_SEED = new URL(
  "../../db/seeds/003_demo_credentials.sql",
  import.meta.url,
);

describe("003_demo_credentials.sql", () => {
  it("commits a hash that verifies against the documented dev password", async () => {
    const sql = readFileSync(DEMO_CREDENTIALS_SEED, "utf8");
    const withoutComments = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    const values = [...withoutComments.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const [, , passwordHash] = values;
    if (!passwordHash) {
      throw new Error("expected the seed's INSERT to carry a quoted password_hash value");
    }
    expect(await verify(DEMO_PASSWORD, passwordHash)).toBe(true);
  });
});
