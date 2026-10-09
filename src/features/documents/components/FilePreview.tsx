export function FilePreview({
  kind,
  url,
  title,
}: {
  kind: "pdf" | "image";
  url: string;
  title: string;
}) {
  if (kind === "image") {
    return (
      // Blob previews cannot go through next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        className="mx-auto max-h-[70vh] w-full rounded-lg border border-slate-100 bg-white object-contain"
      />
    );
  }

  return (
    <iframe
      src={url}
      title={title}
      className="h-[70vh] w-full rounded-lg border border-slate-100 bg-white"
    />
  );
}
