import { describe, it, expect } from "vitest";
import { getAppName } from "./index.js";

describe("index", () => {
  it("should return the correct app name", () => {
    expect(getAppName()).toBe("DocuAI");
  });
});
