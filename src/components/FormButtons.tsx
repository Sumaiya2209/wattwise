import { Loader2 } from "lucide-react";

export function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
      {message}
    </p>
  );
}

export default function FormButtons({
  saving,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="ww-panel-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--ww-text)]"
      >
        Cancel
      </button>
      <button
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 dark:text-[#04120c]"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}