"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { cx } from "@/lib/cx";
import styles from "./Sortable.module.scss";

/** Vertical drag-to-reorder list. Children render their own drag handle via the `handle` props. */
export function SortableList<T extends { id: string }>({
  items,
  onMove,
  children,
}: {
  items: T[];
  onMove: (from: number, to: number) => void;
  children: (item: T, index: number, handle: HandleProps) => React.ReactNode;
}) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  };
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableRow key={item.id} id={item.id}>
            {(handle) => children(item, index, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

export type HandleProps = React.HTMLAttributes<HTMLElement> & { ref?: (el: HTMLElement | null) => void };

function SortableRow({ id, children }: { id: string; children: (handle: HandleProps) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" }}
      className={cx(isDragging && styles.dragging)}
    >
      {children({ ...attributes, ...listeners, ref: setActivatorNodeRef })}
    </div>
  );
}

export function DragHandle({ handle, label }: { handle: HandleProps; label: string }) {
  const { ref, ...rest } = handle;
  return (
    <button
      type="button"
      ref={ref}
      {...rest}
      aria-label={label}
      title="Drag to reorder"
      className={styles.handle}
    >
      <svg viewBox="0 0 24 24" className={styles.handleIcon} fill="currentColor" aria-hidden>
        {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
      </svg>
    </button>
  );
}
