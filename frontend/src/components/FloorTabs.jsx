import React, { useState, useRef } from 'react';
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Check, X, Pencil } from 'lucide-react';

function FloorTabContent({ floor, showRoomCount }) {
  return (
    <span className="floor-tab-label">
      {floor.name}
      {floor.isShared && <span className="floor-tab-shared-badge">Shared</span>}
      {showRoomCount && (
        <span className="floor-tab-count">
          {floor.rooms?.length || 0}
        </span>
      )}
    </span>
  );
}

function SortableFloorTab({
  floor,
  isActive,
  onClick,
  onDelete,
  canDelete,
  onReorderFloors,
  onRename,
  showRoomCount,
  roomDragActive = false,
  roomDropTarget = false,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: floor.id, data: { type: 'floor', floorId: floor.id } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.15 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(floor.name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(floor.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const name = draft.trim();
    if (name && name !== floor.name) onRename?.(floor.id, name);
    setEditing(false);
  };

  const cancelEdit = () => { setDraft(floor.name); setEditing(false); };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`floor-tab ${isActive ? 'active' : ''} ${roomDragActive ? 'floor-tab-room-drag-active' : ''} ${roomDropTarget ? 'floor-tab-room-drop-target' : ''}`}
      onClick={!editing && !roomDragActive ? onClick : undefined}
      onDoubleClick={(!editing && onRename) ? startEdit : undefined}
      title={(!editing && onRename) ? "Double-click to rename" : undefined}
    >
      {onReorderFloors && (
        <span
          className="floor-tab-grip"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={12} />
        </span>
      )}

      {editing ? (
        <input
          ref={inputRef}
          className="floor-tab-rename-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
            if (e.key === 'Escape') cancelEdit();
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <FloorTabContent floor={floor} showRoomCount={showRoomCount} />
      )}

      {!editing && canDelete && (
        <button
          className="floor-tab-delete"
          title="Delete floor"
          onClick={e => { e.stopPropagation(); onDelete(floor.id); }}
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

export default function FloorTabs({
  floors,
  activeFloorId,
  onSelectFloor,
  onReorderFloors = null,
  onAddFloor,
  onAddButtonClick = null,
  onDeleteFloor,
  onRenameFloor = null,
  showAddButton = true,
  showRoomCount = true,
  largeTabs = false,
  extraTab = null,
  addButtonLabel = 'Add Floor',
  roomDragActive = false,
  roomDropTargetFloorId = null,
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAddFloor(name);
    setNewName('');
    setAdding(false);
  };

  const floorIds = floors.map(f => f.id);

  return (
    <div className="floor-tabs-wrapper">
      <SortableContext items={floorIds} strategy={horizontalListSortingStrategy}>
        <div className={`floor-tabs-strip ${largeTabs ? 'large-tabs' : ''}`}>
          {extraTab}
          {floors.map(floor => (
            <SortableFloorTab
              key={floor.id}
              floor={floor}
              isActive={floor.id === activeFloorId}
              onClick={() => onSelectFloor(floor.id)}
              onDelete={onDeleteFloor}
              canDelete={!!onDeleteFloor && floors.length > 1}
              onReorderFloors={onReorderFloors}
              onRename={onRenameFloor}
              showRoomCount={showRoomCount}
              roomDragActive={roomDragActive}
              roomDropTarget={roomDropTargetFloorId === floor.id}
            />
          ))}
          {showAddButton && !adding && (
            <button
              className="floor-tab-add"
              onClick={() => {
                if (onAddButtonClick) {
                  onAddButtonClick();
                  return;
                }
                setAdding(true);
              }}
              title={addButtonLabel}
            >
              <Plus size={14} /> {addButtonLabel}
            </button>
          )}
          {adding && (
            <div className="floor-tab-new-input">
              <input
                autoFocus
                className="form-input floor-tab-input"
                placeholder="Floor name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAdding(false); setNewName(''); }
                }}
              />
              <button className="floor-tab-confirm" onClick={handleAdd} title="Confirm">
                <Check size={14} />
              </button>
              <button className="floor-tab-cancel" onClick={() => { setAdding(false); setNewName(''); }} title="Cancel">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
