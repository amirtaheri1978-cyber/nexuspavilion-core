/**
 * Canonical application shell navigation for Task 23.
 *
 * Hidden navigation is not an authorization boundary. Server/API
 * authorization remains authoritative. Experience labels reuse the
 * existing profiles.role + companies.network_role contract only.
 */

export type ApplicationExperience = "owner" | "vendor" | "consultant";

export type ApplicationNavStats = {
  activeRfqs: number;
  unreadNotifications: number;
  awardedContracts: number;
  supplierQuotes: number;
};

export type ApplicationUserContext = {
  role: string | null;
  networkRole: string | null;
  companyName: string | null;
  companyStatus: string | null;
};

export type ApplicationNavItem = {
  label: string;
  href: string;
  key: string;
  description: string;
  badge?: string;
};

export type ApplicationNavSection = {
  title: string;
  items: ApplicationNavItem[];
};

export type ApplicationBreadcrumb = {
  href: string;
  label: string;
};

export const DEFAULT_APPLICATION_NAV_STATS: ApplicationNavStats = {
  activeRfqs: 0,
  unreadNotifications: 0,
  awardedContracts: 0,
  supplierQuotes: 0,
};

export const APP_SHELL_AUTHENTICATION_ROUTES = [
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/set-password",
  "/invite",
  "/verify",
] as const;

export const APP_SHELL_ONBOARDING_ROUTES = ["/create-company"] as const;

export const APP_SHELL_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
] as const;

export const APP_SHELL_CHROMELESS_PREFIXES = ["/dev", "/rfq/invite"] as const;

export type AppShellKind = "chromeless" | "public" | "application";

export const BOARDROOM_INTELLIGENCE_TITLE = "Strategic Insights";

export const ACCOUNT_MENU_LINKS = [
  {
    href: "/dashboard",
    label: "Executive Overview",
    description: "Procurement command center and workspace overview.",
    icon: "📊",
  },
  {
    href: "/analytics",
    label: "Strategic Insights",
    description: "Risk, board reporting, and executive decisions.",
    icon: "📈",
  },
  {
    href: "/rfq",
    label: "Procurement Center",
    description: "Create, manage, and review procurement opportunities.",
    icon: "📑",
  },
  {
    href: "/directory",
    label: "Supplier Intelligence",
    description: "Approved vendors, partners, and network records.",
    icon: "🤝",
  },
  {
    href: "/notifications",
    label: "Activity Center",
    description: "Alerts, workflow signals, and recent workspace activity.",
    icon: "🔔",
  },
  {
    href: "/company/settings",
    label: "Company Governance",
    description: "Profile, team, access, and governance controls.",
    icon: "🏢",
  },
] as const;

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function getAppShellKind(pathname: string): AppShellKind {
  if (
    matchesRoute(pathname, APP_SHELL_AUTHENTICATION_ROUTES) ||
    matchesRoute(pathname, APP_SHELL_ONBOARDING_ROUTES) ||
    matchesRoute(pathname, APP_SHELL_CHROMELESS_PREFIXES)
  ) {
    return "chromeless";
  }

  if (matchesRoute(pathname, APP_SHELL_PUBLIC_ROUTES)) {
    return "public";
  }

  return "application";
}

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function getExperience(
  context: ApplicationUserContext,
): ApplicationExperience {
  const role = normalizeRole(context.role);
  const networkRole = normalizeRole(context.networkRole);

  if (
    networkRole.includes("architect") ||
    networkRole.includes("engineer") ||
    networkRole.includes("consultant")
  ) {
    return "consultant";
  }

  if (
    role === "vendor" ||
    networkRole.includes("supplier") ||
    networkRole.includes("vendor") ||
    networkRole.includes("manufacturer") ||
    networkRole.includes("distributor") ||
    networkRole.includes("trade")
  ) {
    return "vendor";
  }

  return "owner";
}

export function getExperienceLabel(experience: ApplicationExperience) {
  void experience;
  return "Company Workspace";
}

function formatCountBadge(value: number) {
  return String(value);
}

export function getNavigation(
  experience: ApplicationExperience,
  stats: ApplicationNavStats,
): ApplicationNavSection[] {
  if (experience === "vendor") {
    return [
      {
        title: "Overview",
        items: [
          {
            label: "Executive Overview",
            href: "/dashboard",
            key: "dashboard",
            description: "Company operating view",
            badge: "Live",
          },
        ],
      },
      {
        title: "Company Operations",
        items: [
          {
            label: "Procurement Center",
            href: "/rfq",
            key: "rfq",
            description: "Open RFQs and buyer requests",
            badge: formatCountBadge(stats.activeRfqs),
          },
          {
            label: "Bid & Proposal Submissions",
            href: "/vendor-dashboard",
            key: "vendor-dashboard",
            description: "Submitted quote activity",
            badge: formatCountBadge(stats.supplierQuotes),
          },
        ],
      },
      {
        title: "Intelligence",
        items: [
          {
            label: "Activity Center",
            href: "/notifications",
            key: "notifications",
            description: "Updates and workflow signals",
          },
        ],
      },
      {
        title: "Company",
        items: [
          {
            label: "Company Governance",
            href: "/company/settings",
            key: "company",
            description: "Profile, team, access, governance",
          },
        ],
      },
    ];
  }

  if (experience === "consultant") {
    return [
      {
        title: "Overview",
        items: [
          {
            label: "Executive Overview",
            href: "/dashboard",
            key: "dashboard",
            description: "Company operating view",
            badge: "Live",
          },
        ],
      },
      {
        title: "Company Operations",
        items: [
          {
            label: "Procurement Center",
            href: "/rfq",
            key: "rfq",
            description: "Open procurement activity",
            badge: formatCountBadge(stats.activeRfqs),
          },
        ],
      },
      {
        title: "Intelligence",
        items: [
          {
            label: "Activity Center",
            href: "/notifications",
            key: "notifications",
            description: "Updates, alerts, messages",
          },
        ],
      },
      {
        title: "Company",
        items: [
          {
            label: "Company Governance",
            href: "/company/settings",
            key: "company",
            description: "Profile, team, access, governance",
          },
        ],
      },
    ];
  }

  return [
    {
      title: "Overview",
      items: [
        {
          label: "Executive Overview",
          href: "/dashboard",
          key: "dashboard",
          description: "Procurement command center",
          badge: "Live",
        },
      ],
    },
    {
      title: "Company Operations",
      items: [
        {
          label: "Procurement Center",
          href: "/rfq",
          key: "rfq",
          description: "Create, manage, review RFQs",
          badge: formatCountBadge(stats.activeRfqs),
        },
        {
          label: "Supplier Intelligence",
          href: "/directory",
          key: "directory",
          description: "AVL, suppliers, partners",
        },
      ],
    },
    {
      title: "Intelligence",
      items: [
        {
          label: "Strategic Insights",
          href: "/analytics",
          key: "analytics",
          description: "Risk, board reporting, actions",
        },
          {
            label: "Activity Center",
            href: "/notifications",
            key: "notifications",
            description: "Alerts and workflow signals",
          },
      ],
    },
    {
      title: "Company",
      items: [
        {
          label: "Company Governance",
          href: "/company/settings",
          key: "company",
          description: "Company governance controls",
        },
      ],
    },
  ];
}

export function flattenNavigation(
  experience: ApplicationExperience,
  stats: ApplicationNavStats = DEFAULT_APPLICATION_NAV_STATS,
) {
  return getNavigation(experience, stats).flatMap((section) => section.items);
}

export function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAppSectionTitle(pathname: string) {
  if (isActivePath(pathname, "/analytics")) {
    return BOARDROOM_INTELLIGENCE_TITLE;
  }

  if (pathname === "/dashboard") {
    return "Executive Overview";
  }

  if (isActivePath(pathname, "/rfq")) {
    return "Procurement Center";
  }

  if (isActivePath(pathname, "/directory")) {
    return "Supplier Intelligence";
  }

  if (isActivePath(pathname, "/notifications")) {
    return "Activity Center";
  }

  if (isActivePath(pathname, "/company")) {
    return "Company Governance";
  }

  if (isActivePath(pathname, "/vendor-dashboard")) {
    return "Bid & Proposal Submissions";
  }

  return BOARDROOM_INTELLIGENCE_TITLE;
}

export function getAppBreadcrumbs(pathname: string): ApplicationBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "rfq") {
    if (segments.length === 1 || segments[1] === "invite") {
      return [];
    }

    const rfqRoot = { href: "/rfq", label: "Procurement Center" };

    if (segments[1] === "new") {
      return [rfqRoot, { href: "/rfq/new", label: "New Opportunity" }];
    }

    const opportunityHref = `/rfq/${segments[1]}`;
    const opportunity = {
      href: opportunityHref,
      label: "Opportunity",
    };

    if (segments[2] === "compare") {
      return [
        rfqRoot,
        opportunity,
        { href: `${opportunityHref}/compare`, label: "Compare" },
      ];
    }

    if (segments[2] === "submit") {
      return [
        rfqRoot,
        opportunity,
        { href: `${opportunityHref}/submit`, label: "Submit Quote" },
      ];
    }

    return [rfqRoot, opportunity];
  }

  if (segments[0] === "analytics" && segments[1] === "vendors") {
    return [
      { href: "/analytics", label: BOARDROOM_INTELLIGENCE_TITLE },
      { href: "/analytics/vendors", label: "Vendor Performance" },
    ];
  }

  return [];
}

export function getAppSidebarSections(): Array<{
  label: string;
  items: Array<{ href: string; label: string }>;
}> {
  const items = flattenNavigation("owner");
  const byHref = new Map(items.map((item) => [item.href, item]));

  const pick = (href: string) => {
    const item = byHref.get(href);
    return item ? { href: item.href, label: item.label } : null;
  };

  return [
    {
      label: "Overview",
      items: [pick("/dashboard")].filter(
        (item): item is { href: string; label: string } => Boolean(item),
      ),
    },
    {
      label: "Company Operations",
      items: [pick("/rfq"), pick("/directory")].filter(
        (item): item is { href: string; label: string } => Boolean(item),
      ),
    },
    {
      label: "Intelligence",
      items: [pick("/analytics"), pick("/notifications")].filter(
        (item): item is { href: string; label: string } => Boolean(item),
      ),
    },
    {
      label: "Company",
      items: [pick("/company/settings")].filter(
        (item): item is { href: string; label: string } => Boolean(item),
      ),
    },
  ];
}
