import type { MetadataRoute } from "next";
import { services, siteConfig } from "@/data/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/services",
    "/packages",
    "/business-guide",
    "/faq",
    "/tools",
    "/tools/labor-calculator",
    "/tools/operation-readiness",
    "/tools/nitaqat-indicator",
    "/tools/company-formation-checklist",
    "/tools/activity-requirements",
    "/tools/formation-cost-estimator",
  ];
  const serviceRoutes = services.map((service) => `/services/${service.id}`);

  return [...staticRoutes, ...serviceRoutes].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
