import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return [
    {
      url: `${baseUrl}/`,
      changeFrequency: "daily",
      priority: 1,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/jobs`,
      changeFrequency: "hourly",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sign-in`,
      changeFrequency: "monthly",
      priority: 0.4,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sign-up`,
      changeFrequency: "monthly",
      priority: 0.5,
      lastModified: new Date(),
    },
  ];
}
