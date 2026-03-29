import React, { useState, useRef, useEffect } from 'react';
import { updateConfig } from './configApi';
import { Plus, Trash2, Save, ArrowUp, ArrowDown, ChevronDown, HelpCircle } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'scene',      label: 'Scene',  dpt: 'DPT 17.001' },
  { value: 'switch',     label: 'Switch', dpt: 'DPT 1.001'  },
  { value: 'percentage', label: 'Blind',  dpt: 'DPT 5.001'  },
];

const GA_TOOLTIPS = {
  action:   'The group address this function writes to on the KNX bus. A command is sent here when the function is triggered.',
  scene:    'Scene number to activate (1–64). The bus value is automatically offset by −1 as required by KNX.',
  feedback: 'Status group address — the actuator reports its current state here. Used to keep the UI in sync.',
  moving:   'Group address the actuator uses to signal movement (1 = moving, 0 = stopped). Enables precise wall-switch detection.',
};

// Custom Type dropdown with DPT shown inside each option
function TypeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = TYPE_OPTIONS.find(o => o.value === value) || TYPE_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="type-select" ref={ref}>
      <div className="type-select-trigger" onClick={() => setOpen(o => !o)}>
        <div className="type-select-info">
          <span className="type-select-name">{current.label}</span>
          <span className="type-select-dpt">{current.dpt}</span>
        </div>
        <ChevronDown size={14} className={`type-select-chevron ${open ? 'open' : ''}`} />
      </div>
      {open && (
        <div className="type-select-dropdown">
          {TYPE_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`type-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className="type-select-name">{opt.label}</span>
              <span className="type-select-dpt">{opt.dpt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Labeled input with optional badge + ? tooltip
function GAField({ label, tooltipKey, optional, value, onChange, placeholder, type = 'text', min, max }) {
  return (
    <div className="settings-field ga-field">
      <label className="settings-field-label">
        {label}
        {optional && <span className="badge-optional">Optional</span>}
        <span className="ga-tooltip-wrap">
          <HelpCircle size={11} className="ga-tooltip-icon" />
          <span className="ga-tooltip-bubble">{GA_TOOLTIPS[tooltipKey]}</span>
        </span>
      </label>
      <input
        className="form-input"
        value={value || ''}
        onChange={e => onChange(type === 'number' ? parseInt(e.target.value) : e.target.value)}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
      />
    </div>
  );
}

export default function Settings({ config, fetchConfig, addToast }) {
  const [ip, setIp] = useState(config.knxIp || '');
  const [port, setPort] = useState(config.knxPort || 3671);
  const [rooms, setRooms] = useState(config.rooms || []);
  const [newRoomName, setNewRoomName] = useState('');

  const handleSaveIp = async () => {
    try { await updateConfig({ knxIp: ip, knxPort: port }); addToast('Connection settings saved', 'success'); fetchConfig(); }
    catch { addToast('Failed to save settings', 'error'); }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    const newRoom = { id: Date.now().toString(), name: newRoomName, functions: [] };
    const updated = [...rooms, newRoom];
    try { await updateConfig({ rooms: updated }); setRooms(updated); setNewRoomName(''); addToast('Room added', 'success'); fetchConfig(); }
    catch { addToast('Failed to add room', 'error'); }
  };

  const handleDeleteRoom = async (id) => {
    const updated = rooms.filter(r => r.id !== id);
    try { await updateConfig({ rooms: updated }); setRooms(updated); addToast('Room deleted', 'success'); fetchConfig(); }
    catch { addToast('Failed to delete room', 'error'); }
  };

  const handleAddFunction = async (roomId) => {
    const updated = rooms.map(r => r.id !== roomId ? r : {
      ...r, functions: [...r.functions, { id: Date.now().toString(), name: '', type: 'scene', groupAddress: '', sceneNumber: 1 }]
    });
    try { await updateConfig({ rooms: updated }); setRooms(updated); fetchConfig(); }
    catch { addToast('Failed to add function', 'error'); }
  };

  const handleUpdateFunction = (roomId, funcId, key, val) => {
    setRooms(rooms.map(r => r.id !== roomId ? r : {
      ...r, functions: r.functions.map(f => f.id !== funcId ? f : { ...f, [key]: val })
    }));
  };

  const handleSaveRooms = async () => {
    try { await updateConfig({ rooms }); addToast('Functions saved', 'success'); fetchConfig(); }
    catch { addToast('Failed to save functions', 'error'); }
  };

  const handleDeleteFunction = async (roomId, funcId) => {
    const updated = rooms.map(r => r.id !== roomId ? r : { ...r, functions: r.functions.filter(f => f.id !== funcId) });
    setRooms(updated);
    try { await updateConfig({ rooms: updated }); fetchConfig(); } catch {}
  };

  const moveRoom = (i, dir) => {
    const r = [...rooms];
    if (dir === 'up' && i > 0) [r[i-1], r[i]] = [r[i], r[i-1]];
    if (dir === 'down' && i < r.length-1) [r[i+1], r[i]] = [r[i], r[i+1]];
    setRooms(r);
  };

  const moveFunc = (roomId, fi, dir) => {
    setRooms(rooms.map(r => {
      if (r.id !== roomId) return r;
      const f = [...r.functions];
      if (dir === 'up' && fi > 0) [f[fi-1], f[fi]] = [f[fi], f[fi-1]];
      if (dir === 'down' && fi < f.length-1) [f[fi+1], f[fi]] = [f[fi], f[fi+1]];
      return { ...r, functions: f };
    }));
  };

  const upd = (roomId, funcId, key) => (val) => handleUpdateFunction(roomId, funcId, key, val);

  return (
    <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Connection */}
      <div className="settings-section" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
        <h2>KNX Interface</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          IP address and port of your KNX IP interface.
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="settings-field" style={{ width: '220px' }}>
            <label className="settings-field-label">IP Address</label>
            <input className="form-input" placeholder="192.168.1.50" value={ip} onChange={e => setIp(e.target.value)} />
          </div>
          <div className="settings-field" style={{ width: '100px' }}>
            <label className="settings-field-label">Port</label>
            <input className="form-input" type="number" placeholder="3671" value={port} onChange={e => setPort(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSaveIp} style={{ marginBottom: '1px' }}>
            <Save size={16} /> Save
          </button>
        </div>
      </div>

      {/* Rooms */}
      <div className="settings-section">
        <h2>Rooms &amp; Functions</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Group your KNX devices into rooms and configure their functions.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div className="settings-field" style={{ width: '260px' }}>
            <label className="settings-field-label">New Room</label>
            <input className="form-input" placeholder="e.g. Living Room" value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateRoom()} />
          </div>
          <button className="btn-primary" onClick={handleCreateRoom} style={{ marginBottom: '1px' }}>
            <Plus size={16} /> Add Room
          </button>
        </div>

        <div className="item-list">
          {rooms.map((room, ri) => (
            <div key={room.id} className="room-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>

              {/* Room header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ margin: 0 }}>{room.name}</h3>
                  <button className="sort-btn" onClick={() => moveRoom(ri, 'up')} disabled={ri === 0} title="Move up"><ArrowUp size={13}/></button>
                  <button className="sort-btn" onClick={() => moveRoom(ri, 'down')} disabled={ri === rooms.length-1} title="Move down"><ArrowDown size={13}/></button>
                </div>
                <button className="btn-danger" onClick={() => handleDeleteRoom(room.id)}>
                  <Trash2 size={14} /> Delete Room
                </button>
              </div>

              {/* Functions area */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 className="section-label">Functions</h4>

                {room.functions.map((func, fi) => (
                  <div key={func.id} className="function-card">
                    <div className="function-layout">

                      {/* Sort buttons */}
                      <div className="func-sort">
                        <button className="sort-btn" onClick={() => moveFunc(room.id, fi, 'up')} disabled={fi === 0} title="Move up"><ArrowUp size={12}/></button>
                        <button className="sort-btn" onClick={() => moveFunc(room.id, fi, 'down')} disabled={fi === room.functions.length-1} title="Move down"><ArrowDown size={12}/></button>
                      </div>

                      {/* LEFT: Name + Type */}
                      <div className="func-left-col">
                        <div className="settings-field">
                          <label className="settings-field-label">Name</label>
                          <input className="form-input" value={func.name}
                            onChange={e => handleUpdateFunction(room.id, func.id, 'name', e.target.value)}
                            placeholder="e.g. Lights Off" />
                        </div>
                        <div className="settings-field" style={{ marginTop: '0.6rem' }}>
                          <label className="settings-field-label">Type</label>
                          <TypeSelect value={func.type} onChange={upd(room.id, func.id, 'type')} />
                        </div>
                      </div>

                      {/* RIGHT: GA fields */}
                      <div className="func-right-col">
                        <GAField label="Action GA" tooltipKey="action"
                          value={func.groupAddress}
                          onChange={upd(room.id, func.id, 'groupAddress')}
                          placeholder="e.g. 1/5/0" />

                        {func.type === 'scene' && (
                          <GAField label="Scene Number" tooltipKey="scene"
                            value={func.sceneNumber}
                            onChange={upd(room.id, func.id, 'sceneNumber')}
                            placeholder="1–64" type="number" min={1} max={64} />
                        )}

                        {(func.type === 'switch' || func.type === 'percentage') && (
                          <GAField label="Feedback GA" tooltipKey="feedback"
                            value={func.statusGroupAddress}
                            onChange={upd(room.id, func.id, 'statusGroupAddress')}
                            placeholder="e.g. 1/5/1" />
                        )}

                        {func.type === 'percentage' && (
                          <GAField label="Moving GA" tooltipKey="moving" optional
                            value={func.movingGroupAddress}
                            onChange={upd(room.id, func.id, 'movingGroupAddress')}
                            placeholder="e.g. 1/5/2" />
                        )}
                      </div>

                      {/* Delete */}
                      <div className="func-delete">
                        <button className="btn-danger" style={{ padding: '0.55rem 0.65rem' }}
                          onClick={() => handleDeleteFunction(room.id, func.id)} title="Delete function">
                          <Trash2 size={14} />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}

                {room.functions.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    No functions yet. Add one below.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    onClick={() => handleAddFunction(room.id)}>
                    <Plus size={14} /> Add Function
                  </button>
                  <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--success-color)' }}
                    onClick={handleSaveRooms}>
                    <Save size={14} /> Save Functions
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No rooms added yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}
