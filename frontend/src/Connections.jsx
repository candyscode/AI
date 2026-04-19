import React, { useEffect, useState } from 'react';
import {
  updateConfig,
  discoverHueBridge,
  pairHueBridge,
  unpairHueBridge,
  loadDevConfig
} from './configApi';
import { KNXGroupAddressModal } from './components/KNXGroupAddressModal';
import { createApartmentDraft, ensureUniqueSlug, slugifyApartmentName } from './appModel';
import {
  Save, Plus, Lightbulb, FileText, Plug, Building2, Home as HomeIcon
} from 'lucide-react';

export default function Connections({
  fullConfig,
  apartment,
  config,
  fetchConfig,
  applyConfig,
  addToast,
  knxStatus,
  sharedKnxStatus,
  hueStatus,
  navigateToApartment,
}) {
  const [apartmentName, setApartmentName] = useState(apartment.name);
  const [apartmentSlug, setApartmentSlug] = useState(apartment.slug);
  const [ip, setIp] = useState(config.knxIp || '');
  const [port, setPort] = useState(config.knxPort || 3671);

  const [hueBridgeIp, setHueBridgeIp] = useState(config.hue?.bridgeIp || '');
  const [hueError, setHueError] = useState('');

  const [sharedAccessApartmentId, setSharedAccessApartmentId] = useState(config.sharedAccessApartmentId || apartment.id);

  const [groupAddressModal, setGroupAddressModal] = useState({
    open: false,
    title: 'ETS XML import',
    mode: 'any',
    allowUpload: false,
    helperText: '',
    scope: 'apartment',
  });

  const [apartmentGroupAddressBook, setApartmentGroupAddressBook] = useState(
    Array.isArray(config.importedGroupAddresses) ? config.importedGroupAddresses : []
  );
  const [apartmentGroupAddressFileName, setApartmentGroupAddressFileName] = useState(
    config.importedGroupAddressesFileName || ''
  );
  const [sharedGroupAddressBook, setSharedGroupAddressBook] = useState(
    Array.isArray(config.sharedImportedGroupAddresses) ? config.sharedImportedGroupAddresses : []
  );
  const [sharedGroupAddressFileName, setSharedGroupAddressFileName] = useState(
    config.sharedImportedGroupAddressesFileName || ''
  );

  const [newApartmentName, setNewApartmentName] = useState('');

  useEffect(() => {
    setApartmentName(apartment.name);
    setApartmentSlug(apartment.slug);
    setIp(config.knxIp || '');
    setPort(config.knxPort || 3671);
    setHueBridgeIp(config.hue?.bridgeIp || '');
    setSharedAccessApartmentId(config.sharedAccessApartmentId || apartment.id);
    setApartmentGroupAddressBook(Array.isArray(config.importedGroupAddresses) ? config.importedGroupAddresses : []);
    setApartmentGroupAddressFileName(config.importedGroupAddressesFileName || '');
    setSharedGroupAddressBook(Array.isArray(config.sharedImportedGroupAddresses) ? config.sharedImportedGroupAddresses : []);
    setSharedGroupAddressFileName(config.sharedImportedGroupAddressesFileName || '');
  }, [apartment.id, config]);

  const persistConfig = async (nextConfig) => {
    const result = await updateConfig(nextConfig);
    if (result?.config) applyConfig?.(result.config);
    else await fetchConfig();
  };

  const buildNextConfig = (overrides = {}) => ({
    ...fullConfig,
    building: {
      ...fullConfig.building,
      sharedAccessApartmentId: overrides.sharedAccessApartmentId ?? sharedAccessApartmentId,
      sharedImportedGroupAddresses: overrides.sharedGroupAddressBook ?? sharedGroupAddressBook,
      sharedImportedGroupAddressesFileName: overrides.sharedGroupAddressFileName ?? sharedGroupAddressFileName,
    },
    apartments: fullConfig.apartments.map((entry) => entry.id !== apartment.id ? entry : ({
      ...entry,
      name: overrides.apartmentName ?? apartmentName,
      slug: overrides.apartmentSlug ?? apartmentSlug,
      knxIp: overrides.ip ?? ip,
      knxPort: overrides.port ?? Number(port),
      importedGroupAddresses: overrides.apartmentGroupAddressBook ?? apartmentGroupAddressBook,
      importedGroupAddressesFileName: overrides.apartmentGroupAddressFileName ?? apartmentGroupAddressFileName,
    })),
  });

  const handleSaveApartment = async () => {
    try {
      const baseSlug = slugifyApartmentName(apartmentSlug || apartmentName || apartment.name);
      const uniqueSlug = ensureUniqueSlug(baseSlug, fullConfig.apartments, apartment.id);
      await persistConfig(buildNextConfig({
        apartmentName,
        apartmentSlug: uniqueSlug,
        ip,
        port: Number(port),
      }));
      setApartmentSlug(uniqueSlug);
      addToast('Apartment settings saved', 'success');
    } catch {
      addToast('Failed to save apartment settings', 'error');
    }
  };

  const handleSaveSharedSettings = async () => {
    try {
      await persistConfig(buildNextConfig({ sharedAccessApartmentId }));
      addToast('Shared access settings saved', 'success');
    } catch {
      addToast('Failed to save shared access settings', 'error');
    }
  };

  const handleLoadDevConfig = async () => {
    try {
      const result = await loadDevConfig();
      if (result.success) {
        addToast('Dev config loaded successfully', 'success');
        fetchConfig();
      } else {
        addToast(result.error || 'Failed to load dev config', 'error');
      }
    } catch {
      addToast('Failed to load dev config. Check backend connection.', 'error');
    }
  };

  const handleHueDiscover = async () => {
    setHueStep('discovering');
    setHueError('');
    try {
      const res = await discoverHueBridge(apartment.id);
      if (res.success && res.bridges.length > 0) {
        setHueBridgeIp(res.bridges[0].internalipaddress);
      } else {
        setHueError('No Hue Bridge found.');
      }
    } catch {
      setHueError('Discovery failed. Is the backend running?');
    }
  };

  const handleHuePair = async () => {
    setHueError('');
    try {
      const res = await pairHueBridge(apartment.id, hueBridgeIp);
      if (res.success) {
        addToast('Hue Bridge paired!', 'success');
        fetchConfig();
      } else {
        setHueError(res.error || 'Pairing failed.');
      }
    } catch {
      setHueError('Pairing request failed.');
    }
  };

  const handleHueUnpair = async () => {
    try {
      await unpairHueBridge(apartment.id);
      setHueBridgeIp('');
      addToast('Hue Bridge unpaired', 'success');
      fetchConfig();
    } catch {
      addToast('Failed to unpair', 'error');
    }
  };

  const importGroupAddresses = async (addresses, fileName) => {
    try {
      if (groupAddressModal.scope === 'shared') {
        setSharedGroupAddressBook(addresses);
        setSharedGroupAddressFileName(fileName);
        await persistConfig(buildNextConfig({
          sharedGroupAddressBook: addresses,
          sharedGroupAddressFileName: fileName,
        }));
      } else {
        setApartmentGroupAddressBook(addresses);
        setApartmentGroupAddressFileName(fileName);
        await persistConfig(buildNextConfig({
          apartmentGroupAddressBook: addresses,
          apartmentGroupAddressFileName: fileName,
        }));
      }
      addToast(`Imported ${addresses.length} group addresses`, 'success');
    } catch {
      addToast('Failed to persist imported group addresses', 'error');
    }
  };

  const clearGroupAddresses = async () => {
    try {
      if (groupAddressModal.scope === 'shared') {
        setSharedGroupAddressBook([]);
        setSharedGroupAddressFileName('');
        await persistConfig(buildNextConfig({ sharedGroupAddressBook: [], sharedGroupAddressFileName: '' }));
      } else {
        setApartmentGroupAddressBook([]);
        setApartmentGroupAddressFileName('');
        await persistConfig(buildNextConfig({ apartmentGroupAddressBook: [], apartmentGroupAddressFileName: '' }));
      }
      addToast('Imported group addresses cleared', 'success');
    } catch {
      addToast('Failed to clear imported group addresses', 'error');
    }
  };

  const handleCreateApartment = async () => {
    if (!newApartmentName.trim()) return;

    const newApartment = createApartmentDraft(fullConfig.apartments, newApartmentName.trim());
    try {
      await persistConfig({
        ...fullConfig,
        apartments: [...fullConfig.apartments, newApartment],
      });
      addToast(`Apartment "${newApartment.name}" created`, 'success');
      setNewApartmentName('');
      navigateToApartment(newApartment.slug);
    } catch {
      addToast('Failed to create apartment', 'error');
    }
  };

  const apartmentSupportedCount = apartmentGroupAddressBook.filter((entry) => entry.supported).length;
  const sharedSupportedCount = sharedGroupAddressBook.filter((entry) => entry.supported).length;
  const modalAddressBook = groupAddressModal.scope === 'shared' ? sharedGroupAddressBook : apartmentGroupAddressBook;
  const modalFileName = groupAddressModal.scope === 'shared' ? sharedGroupAddressFileName : apartmentGroupAddressFileName;

  return (
    <div className="glass-panel settings-panel connections-page">
      <div className="connections-section" style={{ borderTop: 'none', marginTop: 0, paddingTop: '1.5rem' }}>
        <div className="connections-section-header">
          <div className="connections-section-icon knx-icon">
            <HomeIcon size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Current Apartment</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Manage this apartment's URL, KNX gateway, Hue bridge and ETS import.
            </p>
          </div>
        </div>

        <div className="connections-grid">
          <div className="settings-field">
            <label className="settings-field-label">Apartment Name</label>
            <input className="form-input" value={apartmentName} onChange={(event) => setApartmentName(event.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">URL Slug</label>
            <input className="form-input" value={apartmentSlug} onChange={(event) => setApartmentSlug(event.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">KNX IP Address</label>
            <input className="form-input" value={ip} placeholder="192.168.1.50" onChange={(event) => setIp(event.target.value)} />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">KNX Port</label>
            <input className="form-input" type="number" value={port} placeholder="3671" onChange={(event) => setPort(event.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSaveApartment}>
            <Save size={16} /> Save Apartment
          </button>
          <button className="btn-secondary" onClick={handleLoadDevConfig}>Load Dev Config</button>
          <div className={`status-badge ${knxStatus.connected ? 'status-connected' : 'status-disconnected'}`}>
            <Plug size={14} />
            <div className="status-dot" />
            <span>{knxStatus.connected ? 'KNX connected' : 'KNX offline'}</span>
          </div>
        </div>
      </div>

      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon ets-icon">
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Apartment ETS XML</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Import the ETS XML for this apartment's own KNX line.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => setGroupAddressModal({
              open: true,
              title: 'Apartment ETS XML import',
              allowUpload: true,
              mode: 'any',
              helperText: 'Upload the ETS XML for this apartment.',
              scope: 'apartment',
            })}
          >
            <FileText size={15} /> Manage Apartment ETS XML
          </button>

          {apartmentGroupAddressFileName && apartmentGroupAddressBook.length > 0 && (
            <div className="ets-status-badge">
              <div className="ets-status-dot" />
              <span>
                <strong>{apartmentGroupAddressFileName}</strong>
                {' · '}
                <span style={{ color: 'var(--text-secondary)' }}>{apartmentSupportedCount} supported addresses</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon hue-icon">
            <Lightbulb size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Philips Hue</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Connect the Hue Bridge for this apartment only.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          {hueStatus.paired ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)' }} />
                <span style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '0.85rem' }}>Paired</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({hueStatus.bridgeIp})</span>
              </div>
              <button className="btn-danger" onClick={handleHueUnpair}>Unpair</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '520px' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={handleHueDiscover}>Discover Bridge</button>
                <input className="form-input" value={hueBridgeIp} placeholder="Hue bridge IP" onChange={(event) => setHueBridgeIp(event.target.value)} style={{ flex: 1, minWidth: '220px' }} />
                <button className="btn-primary" onClick={handleHuePair} disabled={!hueBridgeIp}>Pair</button>
              </div>
              {hueError && <p style={{ color: 'var(--danger-color)', margin: 0 }}>{hueError}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon knx-icon">
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Shared Areas & Shared Information</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Community areas and shared weather data are reached via one apartment's KNX gateway.
            </p>
          </div>
        </div>

        <div className="connections-grid">
          <div className="settings-field">
            <label className="settings-field-label">Shared Access via Apartment</label>
            <select className="form-select" value={sharedAccessApartmentId} onChange={(event) => setSharedAccessApartmentId(event.target.value)}>
              {fullConfig.apartments.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSaveSharedSettings}>
            <Save size={16} /> Save Shared Access
          </button>
          <div className={`status-badge ${sharedKnxStatus.connected ? 'status-connected' : 'status-disconnected'}`}>
            <Plug size={14} />
            <div className="status-dot" />
            <span>{sharedKnxStatus.connected ? 'Shared KNX connected' : 'Shared KNX offline'}</span>
          </div>
        </div>
      </div>

      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon ets-icon">
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Shared ETS XML</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Import the ETS XML that contains the shared areas and shared weather/status group addresses.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => setGroupAddressModal({
              open: true,
              title: 'Shared ETS XML import',
              allowUpload: true,
              mode: 'any',
              helperText: 'Upload the ETS XML for shared areas and shared information.',
              scope: 'shared',
            })}
          >
            <FileText size={15} /> Manage Shared ETS XML
          </button>

          {sharedGroupAddressFileName && sharedGroupAddressBook.length > 0 && (
            <div className="ets-status-badge">
              <div className="ets-status-dot" />
              <span>
                <strong>{sharedGroupAddressFileName}</strong>
                {' · '}
                <span style={{ color: 'var(--text-secondary)' }}>{sharedSupportedCount} supported addresses</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon knx-icon">
            <Plus size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Add Another Apartment</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Add a new apartment directly from the configuration of the current one.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            value={newApartmentName}
            onChange={(event) => setNewApartmentName(event.target.value)}
            placeholder="e.g. Wohnung West"
            style={{ flex: 1, minWidth: '220px', maxWidth: '360px' }}
          />
          <button className="btn-primary" onClick={handleCreateApartment} disabled={!newApartmentName.trim()}>
            <Plus size={16} /> Create Apartment
          </button>
        </div>
      </div>

      <KNXGroupAddressModal
        isOpen={groupAddressModal.open}
        title={groupAddressModal.title}
        addresses={modalAddressBook}
        importedFileName={modalFileName}
        onClose={() => setGroupAddressModal({ open: false, title: '', mode: 'any', allowUpload: false, helperText: '', scope: 'apartment' })}
        onSelect={() => {}}
        onImport={importGroupAddresses}
        onClear={clearGroupAddresses}
        mode={groupAddressModal.mode}
        allowUpload={groupAddressModal.allowUpload}
        helperText={groupAddressModal.helperText}
      />
    </div>
  );
}
