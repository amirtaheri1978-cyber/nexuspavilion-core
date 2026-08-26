import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/set-password",
        "/verify",
        "/create-company",
        "/auth/",
        "/invite/",
        "/dashboard",
        "/rfq",
        "/directory",
        "/analytics",
        "/notifications",
        "/company",
        "/connections",
        "/vendor-dashboard",
      ],
    },
    sitemap: "https://nexuspavilion.com/sitemap.xml",
  };
}
