/**
 * Domain mapping rules.
 * Maps domain patterns to canonical application names, vendors, categories,
 * and domain types for the K-12 environment.
 */

import { type AppCategory, type DomainType } from "@prisma/client";

export interface DomainRule {
  pattern: RegExp;
  appName: string;
  vendor: string;
  category: AppCategory;
  domainType: DomainType;
}

export const DOMAIN_RULES: DomainRule[] = [
  // ─── EdTech / LMS ──────────────────────────────────────────────────

  // Google Workspace
  {
    pattern: /(?:^|\.)classroom\.google\.com$/,
    appName: "Google Classroom",
    vendor: "Google",
    category: "LMS",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)accounts\.google\.com$/,
    appName: "Google Workspace",
    vendor: "Google",
    category: "SSO_IDP",
    domainType: "LOGIN",
  },
  {
    pattern: /(?:^|\.)docs\.google\.com$/,
    appName: "Google Docs",
    vendor: "Google",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)drive\.google\.com$/,
    appName: "Google Drive",
    vendor: "Google",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)meet\.google\.com$/,
    appName: "Google Meet",
    vendor: "Google",
    category: "COMMUNICATION",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)mail\.google\.com$/,
    appName: "Gmail",
    vendor: "Google",
    category: "COMMUNICATION",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)google\.com$/,
    appName: "Google Workspace",
    vendor: "Google",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)googleapis\.com$/,
    appName: "Google Workspace",
    vendor: "Google",
    category: "PRODUCTIVITY",
    domainType: "API",
  },
  {
    pattern: /(?:^|\.)googleusercontent\.com$/,
    appName: "Google Workspace",
    vendor: "Google",
    category: "PRODUCTIVITY",
    domainType: "CDN",
  },
  {
    pattern: /(?:^|\.)gstatic\.com$/,
    appName: "Google CDN",
    vendor: "Google",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },

  // Canvas
  {
    pattern: /(?:^|\.)instructure\.com$/,
    appName: "Canvas LMS",
    vendor: "Instructure",
    category: "LMS",
    domainType: "APP",
  },

  // Clever
  {
    pattern: /(?:^|\.)clever\.com$/,
    appName: "Clever",
    vendor: "Clever Inc",
    category: "SSO_IDP",
    domainType: "LOGIN",
  },

  // ClassLink
  {
    pattern: /(?:^|\.)classlink\.com$/,
    appName: "ClassLink",
    vendor: "ClassLink",
    category: "SSO_IDP",
    domainType: "LOGIN",
  },

  // Seesaw
  {
    pattern: /(?:^|\.)seesaw\.me$/,
    appName: "Seesaw",
    vendor: "Seesaw Learning",
    category: "LMS",
    domainType: "APP",
  },

  // Schoology
  {
    pattern: /(?:^|\.)schoology\.com$/,
    appName: "Schoology",
    vendor: "PowerSchool",
    category: "LMS",
    domainType: "APP",
  },

  // PowerSchool
  {
    pattern: /(?:^|\.)powerschool\.com$/,
    appName: "PowerSchool",
    vendor: "PowerSchool",
    category: "LMS",
    domainType: "APP",
  },

  // ─── Assessment ────────────────────────────────────────────────────

  // Khan Academy
  {
    pattern: /(?:^|\.)khanacademy\.org$/,
    appName: "Khan Academy",
    vendor: "Khan Academy",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // IXL
  {
    pattern: /(?:^|\.)ixl\.com$/,
    appName: "IXL",
    vendor: "IXL Learning",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // Kahoot
  {
    pattern: /(?:^|\.)kahoot\.com$/,
    appName: "Kahoot!",
    vendor: "Kahoot",
    category: "ASSESSMENT",
    domainType: "APP",
  },
  {
    pattern: /^kahoot\.it$/,
    appName: "Kahoot!",
    vendor: "Kahoot",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // Quizlet
  {
    pattern: /(?:^|\.)quizlet\.com$/,
    appName: "Quizlet",
    vendor: "Quizlet Inc",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // Nearpod
  {
    pattern: /(?:^|\.)nearpod\.com$/,
    appName: "Nearpod",
    vendor: "Nearpod Inc",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // Edpuzzle
  {
    pattern: /(?:^|\.)edpuzzle\.com$/,
    appName: "Edpuzzle",
    vendor: "Edpuzzle Inc",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // ─── Social Media (flagged) ────────────────────────────────────────

  // TikTok
  {
    pattern: /(?:^|\.)tiktok\.com$/,
    appName: "TikTok",
    vendor: "ByteDance",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)musical\.ly$/,
    appName: "TikTok",
    vendor: "ByteDance",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)tiktokcdn\.com$/,
    appName: "TikTok",
    vendor: "ByteDance",
    category: "SOCIAL_MEDIA",
    domainType: "CDN",
  },
  {
    pattern: /(?:^|\.)byteoversea\.com$/,
    appName: "TikTok",
    vendor: "ByteDance",
    category: "SOCIAL_MEDIA",
    domainType: "CDN",
  },

  // Instagram
  {
    pattern: /(?:^|\.)instagram\.com$/,
    appName: "Instagram",
    vendor: "Meta",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)cdninstagram\.com$/,
    appName: "Instagram",
    vendor: "Meta",
    category: "SOCIAL_MEDIA",
    domainType: "CDN",
  },

  // Snapchat
  {
    pattern: /(?:^|\.)snapchat\.com$/,
    appName: "Snapchat",
    vendor: "Snap Inc",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)snap\.com$/,
    appName: "Snapchat",
    vendor: "Snap Inc",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)sc-cdn\.net$/,
    appName: "Snapchat",
    vendor: "Snap Inc",
    category: "SOCIAL_MEDIA",
    domainType: "CDN",
  },

  // Discord
  {
    pattern: /(?:^|\.)discord\.com$/,
    appName: "Discord",
    vendor: "Discord Inc",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /^discord\.gg$/,
    appName: "Discord",
    vendor: "Discord Inc",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)discordapp\.com$/,
    appName: "Discord",
    vendor: "Discord Inc",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },

  // Facebook
  {
    pattern: /(?:^|\.)facebook\.com$/,
    appName: "Facebook",
    vendor: "Meta",
    category: "SOCIAL_MEDIA",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)fbcdn\.net$/,
    appName: "Facebook",
    vendor: "Meta",
    category: "SOCIAL_MEDIA",
    domainType: "CDN",
  },

  // ─── Gaming / Entertainment ────────────────────────────────────────

  // Blooket
  {
    pattern: /(?:^|\.)blooket\.com$/,
    appName: "Blooket",
    vendor: "Blooket LLC",
    category: "GAMING",
    domainType: "APP",
  },

  // Gimkit
  {
    pattern: /(?:^|\.)gimkit\.com$/,
    appName: "Gimkit",
    vendor: "Gimkit",
    category: "GAMING",
    domainType: "APP",
  },

  // CoolMathGames
  {
    pattern: /(?:^|\.)coolmathgames\.com$/,
    appName: "CoolMathGames",
    vendor: "Coolmath.com LLC",
    category: "GAMING",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)coolmath\.com$/,
    appName: "CoolMathGames",
    vendor: "Coolmath.com LLC",
    category: "GAMING",
    domainType: "APP",
  },

  // Scratch
  {
    pattern: /(?:^|\.)scratch\.mit\.edu$/,
    appName: "Scratch",
    vendor: "MIT Media Lab",
    category: "CREATIVE",
    domainType: "APP",
  },

  // YouTube
  {
    pattern: /(?:^|\.)youtube\.com$/,
    appName: "YouTube",
    vendor: "Google",
    category: "VIDEO",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)youtu\.be$/,
    appName: "YouTube",
    vendor: "Google",
    category: "VIDEO",
    domainType: "APP",
  },

  // ─── Productivity ──────────────────────────────────────────────────

  // Microsoft 365
  {
    pattern: /(?:^|\.)office\.com$/,
    appName: "Microsoft 365",
    vendor: "Microsoft",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)microsoft\.com$/,
    appName: "Microsoft 365",
    vendor: "Microsoft",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)live\.com$/,
    appName: "Microsoft 365",
    vendor: "Microsoft",
    category: "PRODUCTIVITY",
    domainType: "LOGIN",
  },
  {
    pattern: /(?:^|\.)sharepoint\.com$/,
    appName: "Microsoft 365",
    vendor: "Microsoft",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },

  // Canva
  {
    pattern: /(?:^|\.)canva\.com$/,
    appName: "Canva",
    vendor: "Canva Pty Ltd",
    category: "CREATIVE",
    domainType: "APP",
  },

  // Desmos
  {
    pattern: /(?:^|\.)desmos\.com$/,
    appName: "Desmos",
    vendor: "Desmos Inc",
    category: "ASSESSMENT",
    domainType: "APP",
  },

  // Zoom
  {
    pattern: /(?:^|\.)zoom\.us$/,
    appName: "Zoom",
    vendor: "Zoom Video Communications",
    category: "COMMUNICATION",
    domainType: "APP",
  },

  // ─── Infrastructure / CDN (low risk) ──────────────────────────────

  // Cloudflare
  {
    pattern: /(?:^|\.)cloudflare\.com$/,
    appName: "Cloudflare",
    vendor: "Cloudflare",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },
  {
    pattern: /(?:^|\.)cloudflareinsights\.com$/,
    appName: "Cloudflare",
    vendor: "Cloudflare",
    category: "CDN_INFRASTRUCTURE",
    domainType: "TRACKING",
  },

  // Akamai
  {
    pattern: /(?:^|\.)akamai\.com$/,
    appName: "Akamai CDN",
    vendor: "Akamai",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },
  {
    pattern: /(?:^|\.)akamaized\.net$/,
    appName: "Akamai CDN",
    vendor: "Akamai",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },

  // Apple
  {
    pattern: /(?:^|\.)apple\.com$/,
    appName: "Apple Services",
    vendor: "Apple",
    category: "CDN_INFRASTRUCTURE",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)icloud\.com$/,
    appName: "iCloud",
    vendor: "Apple",
    category: "PRODUCTIVITY",
    domainType: "APP",
  },
  {
    pattern: /(?:^|\.)mzstatic\.com$/,
    appName: "Apple CDN",
    vendor: "Apple",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },

  // Amazon CDN
  {
    pattern: /(?:^|\.)cloudfront\.net$/,
    appName: "Amazon CloudFront",
    vendor: "Amazon",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },
  {
    pattern: /(?:^|\.)amazonaws\.com$/,
    appName: "Amazon AWS",
    vendor: "Amazon",
    category: "CDN_INFRASTRUCTURE",
    domainType: "CDN",
  },

  // ─── Analytics / Tracking ──────────────────────────────────────────

  {
    pattern: /(?:^|\.)google-analytics\.com$/,
    appName: "Google Analytics",
    vendor: "Google",
    category: "ANALYTICS",
    domainType: "TRACKING",
  },
  {
    pattern: /(?:^|\.)googletagmanager\.com$/,
    appName: "Google Tag Manager",
    vendor: "Google",
    category: "ANALYTICS",
    domainType: "TRACKING",
  },
  {
    pattern: /(?:^|\.)doubleclick\.net$/,
    appName: "Google Ads",
    vendor: "Google",
    category: "ADVERTISING",
    domainType: "TRACKING",
  },
  {
    pattern: /(?:^|\.)hotjar\.com$/,
    appName: "Hotjar",
    vendor: "Hotjar",
    category: "ANALYTICS",
    domainType: "TRACKING",
  },
  {
    pattern: /(?:^|\.)segment\.io$/,
    appName: "Segment",
    vendor: "Twilio",
    category: "ANALYTICS",
    domainType: "TRACKING",
  },
  {
    pattern: /(?:^|\.)segment\.com$/,
    appName: "Segment",
    vendor: "Twilio",
    category: "ANALYTICS",
    domainType: "TRACKING",
  },
];
