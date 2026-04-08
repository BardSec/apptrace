/**
 * Batch classification runner.
 * Classifies all WebApps in the database.
 */

import { prisma } from "@/lib/prisma";
import { classifyApp } from "./index";

export async function classifyAllApps(): Promise<{
  classified: number;
  errors: number;
}> {
  const apps = await prisma.webApp.findMany({
    select: { id: true },
  });

  let classified = 0;
  let errors = 0;

  for (const app of apps) {
    try {
      await classifyApp(app.id);
      classified++;
    } catch (err) {
      console.error(`Classification failed for app ${app.id}:`, err);
      errors++;
    }
  }

  return { classified, errors };
}
