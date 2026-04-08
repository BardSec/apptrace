"use client";

export function ReviewDetail({ reviewId }: { reviewId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review detail placeholder for <code>{reviewId}</code>.
      </p>
    </div>
  );
}
