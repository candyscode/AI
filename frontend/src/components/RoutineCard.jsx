import React from 'react';
import {
  Play, Pause, Pencil, Trash2, Clock, AlertTriangle, CheckCircle, XCircle,
  Repeat, ChevronRight,
} from 'lucide-react';

function getNextRun(time) {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function resolveActionLabel(action, floors) {
  if (!floors) return action.targetId;
  for (const floor of floors) {
    if (!Array.isArray(floor.rooms)) continue;
    const room = floor.rooms.find((r) => r.id === action.roomId);
    if (!room) continue;
    if (action.kind === 'scene') {
      const scene = Array.isArray(room.scenes) ? room.scenes.find((s) => s.id === action.targetId) : null;
      return scene ? `${floor.name} › ${room.name} › ${scene.name}` : null;
    } else {
      const func = Array.isArray(room.functions) ? room.functions.find((f) => f.id === action.targetId) : null;
      const valStr = action.targetType === 'percentage'
        ? `${action.value}%`
        : (action.value ? 'On' : 'Off');
      return func ? `${floor.name} › ${room.name} › ${func.name} (${valStr})` : null;
    }
  }
  return null;
}

function isBroken(routine, floors) {
  if (!routine.actions || routine.actions.length === 0) return false;
  return routine.actions.some((action) => resolveActionLabel(action, floors) === null);
}

export default function RoutineCard({ routine, floors, onToggle, onEdit, onDelete }) {
  const broken = isBroken(routine, floors);
  const nextRun = getNextRun(routine.time);

  return (
    <div className={`routine-card ${broken ? 'routine-card--broken' : ''}`}>
      {/* Header row */}
      <div className="routine-card-header">
        <div className="routine-card-title-row">
          <span className="routine-card-name">{routine.name || 'Unnamed Routine'}</span>
          {broken && (
            <span className="badge badge-broken">
              <AlertTriangle size={12} /> Broken
            </span>
          )}
          {routine.lastRunStatus === 'error' && !broken && (
            <span className="badge badge-error">
              <XCircle size={12} /> Last run failed
            </span>
          )}
          {routine.lastRunStatus === 'ok' && (
            <span className="badge badge-ok">
              <CheckCircle size={12} /> OK
            </span>
          )}
        </div>

        <div className="routine-card-actions">
          <button
            className={`routine-toggle-btn ${routine.enabled ? 'enabled' : 'disabled'}`}
            onClick={() => onToggle(!routine.enabled)}
            title={routine.enabled ? 'Disable' : 'Enable'}
            disabled={broken && !routine.enabled}
          >
            {routine.enabled ? <Pause size={14} /> : <Play size={14} />}
            {routine.enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button className="icon-btn" onClick={onEdit} title="Edit routine">
            <Pencil size={15} />
          </button>
          <button className="icon-btn btn-danger" onClick={onDelete} title="Delete routine">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="routine-card-meta">
        <span title="Time">
          <Clock size={13} /> {routine.time}
        </span>
        <span title="Frequency">
          <Repeat size={13} /> Daily
        </span>
        {nextRun && (
          <span title="Next run">
            <ChevronRight size={13} /> Next: {nextRun}
          </span>
        )}
        {routine.lastRunAt && (
          <span title="Last run" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            Last: {new Date(routine.lastRunAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Actions list */}
      {routine.actions && routine.actions.length > 0 && (
        <div className="routine-card-action-list">
          {routine.actions.map((action, i) => {
            const label = resolveActionLabel(action, floors);
            return (
              <div key={action.id} className={`routine-action-chip ${label === null ? 'broken' : ''}`}>
                <span className="routine-action-index">{i + 1}</span>
                <span className="routine-action-label">
                  {label ?? <span style={{ color: 'var(--danger-color)' }}>⚠ Target deleted</span>}
                </span>
                <span className="routine-action-kind">{action.kind}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
