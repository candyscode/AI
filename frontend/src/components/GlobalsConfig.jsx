import React, { useState, useEffect } from 'react';
import { Plus, Check, X, AlertTriangle, Info, Thermometer, Wind, Sun } from 'lucide-react';

function ItemSection({
  title,
  items,
  type,
  apartments,
  houseWideInfoReadApartmentId,
  setItems,
  saveItems,
  saveHouseWideInfoReadApartment,
  openGroupAddressModal,
  emptyText,
  resolveGroupAddressName,
  requestConfirm,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: 'temperature', statusGroupAddress: '' });
  // Local shadow state so edits don't trigger saves on every keystroke
  const [localItems, setLocalItems] = useState(() => items);

  // Keep local shadow in sync when parent items change (e.g. after navigation)
  useEffect(() => { setLocalItems(items); }, [items]);

  const getCategoryIcon = (category) => {
    if (type === 'alarm') return <AlertTriangle size={18} style={{ color: 'var(--danger-color)' }} />;
    if (category === 'temperature') return <Thermometer size={18} style={{ color: '#3b82f6' }} />;
    if (category === 'wind') return <Wind size={18} style={{ color: '#0ea5e9' }} />;
    if (category === 'lux') return <Sun size={18} style={{ color: '#eab308' }} />;
    return <Info size={18} />;
  };

  const gaBrowseConfig = {
    info: {
      title: 'Select House-Wide Information Group Address',
      dptFilter: '9.',
      helperText: 'Select a compatible house-wide information GA matching DPT 9.x.',
    },
    alarm: {
      title: 'Select Alarm Group Address',
      dptFilter: '1.',
      helperText: 'Select a compatible alarm GA matching DPT 1.x.',
    },
  };

  const handleAdd = async () => {
    if (!draft.name.trim()) return;

    const nextItems = [
      ...localItems,
      {
        id: `${type}_${Date.now()}`,
        name: draft.name.trim(),
        type,
        category: type === 'alarm' ? 'alarm' : draft.category,
        statusGroupAddress: draft.statusGroupAddress,
        dpt: '',
      },
    ];

    const success = await saveItems(nextItems);
    if (success) {
      setAdding(false);
      setDraft({ name: '', category: 'temperature', statusGroupAddress: '' });
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await requestConfirm?.({
      title: type === 'alarm' ? 'Delete Alarm' : 'Delete House-Wide Information',
      message: 'Delete this item?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    const next = localItems.filter((item) => item.id !== id);
    setLocalItems(next);
    setItems(next);
    await saveItems(next);
  };

  // Only update local shadow — persist on blur
  const updateLocalItem = (id, key, value) => {
    setLocalItems((prev) => prev.map((item) => item.id === id ? { ...item, [key]: value } : item));
  };

  // Persist after a field loses focus (silent — no toast)
  const commitItem = (id) => {
    const updated = localItems.map((item) =>
      item.id === id ? localItems.find((i) => i.id === id) : item
    );
    setItems(localItems);
    saveItems(localItems);
  };

  // For dropdowns that don't have a blur event — persist immediately but silently
  const updateAndCommitItem = (id, key, value) => {
    const next = localItems.map((item) => item.id === id ? { ...item, [key]: value } : item);
    setLocalItems(next);
    setItems(next);
    saveItems(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
      </div>

      {type === 'info' && (
        <div className="settings-field" style={{ maxWidth: '320px' }}>
          <label className="settings-field-label" htmlFor="house-wide-info-read-apartment">
            Read Values Using Apartment Gateway
          </label>
          <select
            id="house-wide-info-read-apartment"
            className="form-select"
            value={houseWideInfoReadApartmentId || apartments?.[0]?.id || ''}
            onChange={(event) => {
              void saveHouseWideInfoReadApartment?.(event.target.value);
            }}
          >
            {(apartments || []).map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </div>
      )}

      {items.length === 0 && !adding && (
        <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '12px', color: 'var(--text-secondary)' }}>
          {emptyText}
        </div>
      )}

      {localItems.map((item) => (
        <div key={item.id} className="function-card" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', paddingRight: '3rem' }}>
          <button
            type="button"
            className="icon-btn btn-danger"
            onClick={() => handleDelete(item.id)}
            title="Delete item"
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '26px', height: '26px', padding: '0', borderRadius: '50%' }}
          >
            <X size={14} />
          </button>

          <div style={{ padding: '2.05rem 0 0.5rem 0.5rem' }}>{getCategoryIcon(item.category)}</div>

          <div className="settings-field" style={{ flex: 1, minWidth: '180px' }}>
            <label className="settings-field-label">Name</label>
            <input
              className="form-input"
              value={item.name}
              onChange={(event) => updateLocalItem(item.id, 'name', event.target.value)}
              onBlur={() => commitItem(item.id)}
              placeholder={type === 'alarm' ? 'e.g. Rain Alarm' : 'e.g. Outside Temperature'}
            />
          </div>

          {type === 'info' && (
          <div className="settings-field" style={{ width: '240px', minWidth: '240px' }}>
            <label className="settings-field-label">Category</label>
            <select
                className="form-select"
                value={item.category}
                onChange={(event) => updateAndCommitItem(item.id, 'category', event.target.value)}
              >
                <option value="temperature">Temperature (°C)</option>
                <option value="wind">Wind (m/s)</option>
                <option value="lux">Brightness (Lux)</option>
              </select>
            </div>
          )}

          <div className="settings-field ga-field" style={{ flex: 1, minWidth: '180px' }}>
            <label className="settings-field-label">Group Address</label>
            <div className="ga-field-input-row">
              <input
                className="form-input"
                value={item.statusGroupAddress || ''}
                onChange={(event) => updateLocalItem(item.id, 'statusGroupAddress', event.target.value)}
                onBlur={() => commitItem(item.id)}
                placeholder="e.g. 1/1/1"
              />
              <button
                type="button"
                className="btn-secondary-sm ga-browse-btn"
                onClick={() => openGroupAddressModal({
                  title: gaBrowseConfig[type].title,
                  mode: 'any',
                  dptFilter: gaBrowseConfig[type].dptFilter,
                  target: { kind: type === 'alarm' ? 'alarm' : 'sharedInfo', id: item.id },
                  allowUpload: false,
                  helperText: gaBrowseConfig[type].helperText,
                  scope: type === 'alarm' ? 'apartment' : 'shared',
                })}
                title="Browse ETS addresses"
              >
                Browse
              </button>
            </div>
            {resolveGroupAddressName?.(item.statusGroupAddress || '', type) && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                XML match: <strong style={{ color: 'var(--text-primary)' }}>{resolveGroupAddressName(item.statusGroupAddress || '', type)}</strong>
              </div>
            )}
          </div>
        </div>
      ))}

      {adding && (
        <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {type === 'alarm' ? <><AlertTriangle size={16} /> New Alarm</> : <><Info size={16} /> New House-Wide Information</>}
          </h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="settings-field" style={{ flex: 1, minWidth: '220px' }}>
              <label className="settings-field-label">Name</label>
              <input
                className="form-input"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder={type === 'alarm' ? 'e.g. Rain Alarm' : 'e.g. Outside Temperature'}
                autoFocus
              />
            </div>
            {type === 'info' && (
              <div className="settings-field" style={{ width: '240px', minWidth: '240px' }}>
                <label className="settings-field-label">Category</label>
                <select
                  className="form-select"
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                >
                  <option value="temperature">Temperature (°C)</option>
                  <option value="wind">Wind (m/s)</option>
                  <option value="lux">Brightness (Lux)</option>
                </select>
              </div>
            )}
            <div className="settings-field ga-field" style={{ flex: 1, minWidth: '280px' }}>
              <label className="settings-field-label">Group Address</label>
              <div className="ga-field-input-row">
                <input
                  className="form-input"
                  value={draft.statusGroupAddress}
                  onChange={(event) => setDraft({ ...draft, statusGroupAddress: event.target.value })}
                  placeholder="e.g. 1/1/1"
                />
                <button
                  type="button"
                  className="btn-secondary-sm ga-browse-btn"
                  onClick={() => openGroupAddressModal({
                    title: gaBrowseConfig[type].title,
                    mode: 'any',
                    dptFilter: gaBrowseConfig[type].dptFilter,
                    allowUpload: false,
                    helperText: gaBrowseConfig[type].helperText,
                    scope: type === 'alarm' ? 'apartment' : 'shared',
                    onSelect: (groupAddress) => {
                      setDraft((prev) => ({
                        ...prev,
                        statusGroupAddress: groupAddress.address,
                      }));
                    },
                  })}
                  title="Browse ETS addresses"
                >
                  Browse
                </button>
              </div>
              {resolveGroupAddressName?.(draft.statusGroupAddress || '', type) && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  XML match: <strong style={{ color: 'var(--text-primary)' }}>{resolveGroupAddressName(draft.statusGroupAddress || '', type)}</strong>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn-primary" onClick={handleAdd} disabled={!draft.name.trim()}>
              <Check size={16} /> Save Item
            </button>
            <button className="btn-secondary" onClick={() => setAdding(false)}>
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setAdding(true)}>
            <Plus size={16} /> {type === 'alarm' ? 'Add Alarm' : 'Add House-Wide Information'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GlobalsConfig({
  apartments,
  sharedInfos,
  apartmentAlarms,
  houseWideInfoReadApartmentId,
  setSharedInfos,
  setApartmentAlarms,
  saveSharedInfos,
  saveApartmentAlarms,
  saveHouseWideInfoReadApartment,
  openGroupAddressModal,
  requestConfirm,
  resolveGroupAddressName,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <ItemSection
        title="House-Wide Information"
        items={sharedInfos}
        type="info"
        apartments={apartments}
        houseWideInfoReadApartmentId={houseWideInfoReadApartmentId}
        setItems={setSharedInfos}
        saveItems={saveSharedInfos}
        saveHouseWideInfoReadApartment={saveHouseWideInfoReadApartment}
        openGroupAddressModal={openGroupAddressModal}
        emptyText="No house-wide information configured yet."
        resolveGroupAddressName={resolveGroupAddressName}
        requestConfirm={requestConfirm}
      />

      <ItemSection
        title="Apartment Alarms"
        items={apartmentAlarms}
        type="alarm"
        setItems={setApartmentAlarms}
        saveItems={saveApartmentAlarms}
        openGroupAddressModal={openGroupAddressModal}
        emptyText="No apartment-specific alarms configured yet."
        resolveGroupAddressName={resolveGroupAddressName}
        requestConfirm={requestConfirm}
      />
    </div>
  );
}
