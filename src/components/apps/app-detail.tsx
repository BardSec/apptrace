"use client";

export function AppDetail({ appId }: { appId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        App detail placeholder for <code>{appId}</code>.
      </p>
    </div>
  );
}
