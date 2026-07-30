import { describe, expect, it } from "vitest";
import { promotionSchema, registerSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("accepts a Singapore mobile number", () => {
    const parsed = registerSchema.safeParse({
      fullName: "Test Member",
      mobile: "91234567",
      email: "member@example.com",
      password: "password123",
      termsConsent: true,
      privacyConsent: true,
      marketingConsent: false
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid Singapore mobile prefixes", () => {
    const parsed = registerSchema.safeParse({
      fullName: "Test Member",
      mobile: "51234567",
      email: "member@example.com",
      password: "password123",
      termsConsent: true,
      privacyConsent: true,
      marketingConsent: false
    });

    expect(parsed.success).toBe(false);
  });
});

describe("promotionSchema", () => {
  it.each(["/en/register", "/en/menu", "/en/membership", "/en/promotions", "https://example.com"])(
    "accepts %s as a CTA URL",
    (ctaUrl) => {
      const parsed = promotionSchema.safeParse({
        locale: "en",
        slug: "student-month",
        title: "Student Month",
        ctaUrl,
        displayOrder: 0,
        showOnHomepage: false,
        status: "draft"
      });

      expect(parsed.success).toBe(true);
    }
  );
});
