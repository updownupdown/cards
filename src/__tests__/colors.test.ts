import { describe, expect, jest, test } from "@jest/globals";
import { rgba } from "@/styles/styles";

describe("rgba", () => {
  test("applies an opacity to hex colours", () => {
    expect(rgba("#343f49", 0.5)).toBe("rgba(52, 63, 73, 0.5)");
    expect(rgba("343f49", 1)).toBe("rgba(52, 63, 73, 1)");
    expect(rgba("#fff", 0.2)).toBe("rgba(255, 255, 255, 0.2)");
  });

  test("replaces the alpha of an 8-digit hex colour", () => {
    expect(rgba("#ff000080", 0.3)).toBe("rgba(255, 0, 0, 0.3)");
  });

  test("replaces the alpha of rgb() and rgba() colours", () => {
    expect(rgba("rgba(170, 186, 200, 0.2)", 1)).toBe("rgba(170, 186, 200, 1)");
    expect(rgba("rgb(1,2,3)", 0.4)).toBe("rgba(1, 2, 3, 0.4)");
  });

  test("returns unsupported colours unchanged instead of NaN channels", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(rgba("transparent", 0.5)).toBe("transparent");
    expect(rgba("none", 0.5)).not.toContain("NaN");

    warn.mockRestore();
  });
});
