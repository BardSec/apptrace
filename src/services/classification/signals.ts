/**
 * Signal definitions for data collection detection.
 * Each signal represents a type of student data that an application may collect.
 */

export interface Signal {
  id: string;
  name: string;
  category: string;
  weight: number;
  description: string;
}

export const SIGNAL_DEFINITIONS: Signal[] = [
  {
    id: "pii_name",
    name: "Student Name",
    category: "PII",
    weight: 3,
    description: "Application collects student names",
  },
  {
    id: "pii_email",
    name: "Email Address",
    category: "PII",
    weight: 3,
    description: "Application collects email addresses",
  },
  {
    id: "location",
    name: "Location Data",
    category: "Behavioral",
    weight: 5,
    description: "Application collects location or geolocation data",
  },
  {
    id: "analytics_tracking",
    name: "Analytics Tracking",
    category: "Behavioral",
    weight: 2,
    description: "Application uses third-party analytics or tracking pixels",
  },
  {
    id: "third_party_sharing",
    name: "Third-Party Data Sharing",
    category: "Sharing",
    weight: 5,
    description: "Application shares data with third parties",
  },
];
