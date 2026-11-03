import { describe, expect, it } from "vitest";
import { safeAdminNext } from "@/lib/safe-next";

describe("safeAdminNext (open-redirect protection after login)", () => {
  it.each([
    ["/admin/connector/authorize/abc", "/admin/connector/authorize/abc"],
    ["/admin/blog?x=1", "/admin/blog?x=1"],
    ["//evil.example/admin", "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["/admin\\@evil.example", "/admin"],
    ["/blog", "/admin"],
    ["/admin/login", "/admin"],
    ["/admin/login?next=/admin", "/admin"],
    ["", "/admin"],
    [null, "/admin"],
  ])("%s → %s", (input, expected) => {
    expect(safeAdminNext(input)).toBe(expected);
  });
});
