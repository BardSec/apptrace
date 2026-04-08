export default function AppDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">App Detail</h1>
      <p className="mt-2 text-muted-foreground">
        Detail view for app <code>{params.id}</code>.
      </p>
    </div>
  );
}
