import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
return [
{
url: "https://nexuspavilion.com",
lastModified: new Date(),
changeFrequency: "daily",
priority: 1,
},

{
url: "https://nexuspavilion.com/rfq",
lastModified: new Date(),
changeFrequency: "daily",
priority: 0.9,
},

{
url: "https://nexuspavilion.com/directory",
lastModified: new Date(),
changeFrequency: "weekly",
priority: 0.8,
},

{
url: "https://nexuspavilion.com/analytics",
lastModified: new Date(),
changeFrequency: "weekly",
priority: 0.7,
},

{
url: "https://nexuspavilion.com/notifications",
lastModified: new Date(),
changeFrequency: "daily",
priority: 0.6,
},
];
}