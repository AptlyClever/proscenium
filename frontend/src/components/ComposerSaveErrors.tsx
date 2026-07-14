type ComposerSaveErrorsProps = {
  error: Error | null | undefined;
  title?: string;
};

export function ComposerSaveErrors({ error, title = "Could not save Hail" }: ComposerSaveErrorsProps) {
  if (!error) {
    return null;
  }

  let errs: { path?: unknown; message?: unknown }[] = [];
  try {
    const parsed = JSON.parse(error.message) as {
      detail?: { validation_errors?: { path?: unknown; message?: unknown }[] };
    };
    errs = parsed?.detail?.validation_errors ?? [];
  } catch {
    // non-JSON error body
  }

  return (
    <div className="ca-banner-error rounded-md p-3 text-ca-xs" role="alert" data-hails-composer-save-error>
      <p className="font-medium">{title}</p>
      {errs.length ? (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {errs.map((entry, index) => (
            <li key={index}>
              <span className="font-mono">{String(entry.path ?? "/")}</span> — {String(entry.message ?? "")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">{error.message}</p>
      )}
    </div>
  );
}
