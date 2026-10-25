import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv(valid)).toMatchObject({ PORT: 4000, JWT_EXPIRES_IN: "30m" });
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it("rejects a weak JWT secret", () => {
    expect(() => parseEnv({ ...valid, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });
});
