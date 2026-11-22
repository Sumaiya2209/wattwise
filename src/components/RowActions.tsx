import { Pencil, Trash2 } from "lucide-react";

export default function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={onEdit}
        aria-label="Edit"
        className="rounded-lg p-2 text-[var(--ww-muted)] hover:bg-emerald-500/10 hover:text-emerald-500"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="rounded-lg p-2 text-[var(--ww-muted)] hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}