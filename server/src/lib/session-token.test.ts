import { sign } from "hono/jwt";
import { describe, expect, it } from "vitest";

import { issue, read } from "./session-token.ts";

const SECRET = "test-secret";

describe("session-token", () => {
  it("reads back to the same client id it was issued for", async () => {
    const token = await issue("client-1", SECRET);
    expect(await read(token, SECRET)).toBe("client-1");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await issue("client-1", SECRET);
    expect(await read(token, "a-different-secret")).toBeUndefined();
  });

  it("rejects an expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await sign({ sub: "client-1", iat: now - 120, exp: now - 60 }, SECRET, "HS256");
    expect(await read(expired, SECRET)).toBeUndefined();
  });

  it("rejects a structurally malformed token without throwing", async () => {
    await expect(read("not-a-jwt", SECRET)).resolves.toBeUndefined();
    await expect(read("", SECRET)).resolves.toBeUndefined();
    await expect(read("a.b.c", SECRET)).resolves.toBeUndefined();
  });

  it("rejects a token whose payload has been altered", async () => {
    const token = await issue("client-1", SECRET);
    const [header, , signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "client-2", iat: 0, exp: 9_999_999_999 }),
    ).toString("base64url");
    const tampered = `${header}.${tamperedPayload}.${signature}`;
    expect(await read(tampered, SECRET)).toBeUndefined();
  });
});
