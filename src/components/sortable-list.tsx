"use client";

// A vertical drag-to-reorder list. Dragging only starts from the grip handle,
// so on a phone you can still scroll the page, tap a checkbox, or tap text to
// edit it without accidentally picking up the row. Keyboard works too: focus
// a grip, press Space, use the arrow keys, press Space again.

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { positionBetween } from "@/lib/ordering";

export type Positioned = { id: string; position: number };

export function SortableList<T extends Positioned>({
  dndId,
  items,
  onReorder,
  renderItem,
}: {
  // Stable id so server and client render the same aria attributes.
  dndId: string;
  items: T[];
  onReorder: (id: string, position: number) => void;
  renderItem: (item: T, handle: React.ReactNode) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;

    const moved = arrayMove(items, from, to);
    onReorder(
      String(active.id),
      positionBetween(moved[to - 1]?.position, moved[to + 1]?.position)
    );
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableRow key={item.id} id={item.id}>
            {(handle) => renderItem(item, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="-ml-1 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        isDragging
          ? "relative z-10 rounded-md bg-card shadow-lg ring-1 ring-primary/30"
          : undefined
      }
    >
      {children(handle)}
    </div>
  );
}
