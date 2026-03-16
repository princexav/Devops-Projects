import { describe, it, expect } from "vitest";
import { cn, formatDate, getInitials } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts correctly", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-03-14");
    expect(result).toContain("Mar");
    expect(result).toContain("14");
    expect(result).toContain("2026");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-01-01"));
    expect(result).toContain("Jan");
  });
});

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("Sarah Johnson")).toBe("SJ");
  });

  it("handles single name", () => {
    expect(getInitials("Sarah")).toBe("S");
  });

  it("limits to two characters", () => {
    expect(getInitials("Sarah Marie Johnson")).toBe("SM");
  });
});
