/**
 * Mock data generator.
 * Produces synthetic ingestion data for development and testing.
 */

export interface MockApp {
  domain: string;
  name: string;
  firstSeen: Date;
  hitCount: number;
}

export function generateMockApps(count: number = 20): MockApp[] {
  const apps: MockApp[] = [
    { domain: "kahoot.it", name: "Kahoot!", firstSeen: new Date(), hitCount: 450 },
    { domain: "quizlet.com", name: "Quizlet", firstSeen: new Date(), hitCount: 380 },
    { domain: "docs.google.com", name: "Google Docs", firstSeen: new Date(), hitCount: 1200 },
    { domain: "canva.com", name: "Canva", firstSeen: new Date(), hitCount: 210 },
    { domain: "clever.com", name: "Clever", firstSeen: new Date(), hitCount: 890 },
    { domain: "classroom.google.com", name: "Google Classroom", firstSeen: new Date(), hitCount: 1100 },
    { domain: "zoom.us", name: "Zoom", firstSeen: new Date(), hitCount: 670 },
    { domain: "nearpod.com", name: "Nearpod", firstSeen: new Date(), hitCount: 340 },
    { domain: "flipgrid.com", name: "Flipgrid", firstSeen: new Date(), hitCount: 290 },
    { domain: "edpuzzle.com", name: "Edpuzzle", firstSeen: new Date(), hitCount: 260 },
  ];

  return apps.slice(0, count);
}
