import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Omit lastModified until actual content revision dates are available.
  // A build/request timestamp is not evidence that every public page changed.
  return [
    {
      url: "https://nexuspavilion.com",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://nexuspavilion.com/about",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://nexuspavilion.com/contact",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://nexuspavilion.com/products/intelligent-procurement",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
