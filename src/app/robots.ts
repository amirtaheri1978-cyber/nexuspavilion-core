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
        "/dashboard",
        "/analytics",
        "/vendor-dashboard",
        "/notifications",
        "/company",
        "/directory",
        "/invite/",
        "/rfq",
      ],
    },
    sitemap: "https://nexuspavilion.com/sitemap.xml",
  };
}
