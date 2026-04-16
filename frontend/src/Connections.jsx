import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  updateConfig, discoverHueBridge, pairHueBridge, unpairHueBridge,
  loadDevConfig
} from './configApi';
import { KNXGroupAddressModal } from './components/KNXGroupAddressModal';
import {
  Save, Sparkles, Lightbulb, FileText, Wifi, Plug
} from 'lucide-react';

export default function Connections({ config, fetchConfig, addToast, hueStatus, setHueStatus }) {
  const [ip, setIp] = useState(config.knxIp || '');
  const [port, setPort] = useState(config.knxPort || 3671);

  const [hueStep, setHueStep] = useState('idle');
  const [hueBridgeIp, setHueBridgeIp] = useState(config.hue?.bridgeIp || '');
  const [hueError, setHueError] = useState('');

  const [groupAddressModal, setGroupAddressModal] = useState({
    open: false, title: 'ETS XML import', mode: 'any', allowUpload: false, helperText: ''
  });
  const [groupAddressBook, setGroupAddressBook] = useState(
    Array.isArray(config.importedGroupAddresses) ? config.importedGroupAddresses : []
  );
  const [groupAddressFileName, setGroupAddressFileName] = useState(
    config.importedGroupAddressesFileName || ''
  );

  useEffect(() => {
    setIp(config.knxIp || '');
    setPort(config.knxPort || 3671);
    setHueBridgeIp(config.hue?.bridgeIp || '');
    setGroupAddressBook(Array.isArray(config.importedGroupAddresses) ? config.importedGroupAddresses : []);
    setGroupAddressFileName(config.importedGroupAddressesFileName || '');
  }, [config]);

  // ── KNX ─────────────────────────────────────────────────────────────────────
  const handleSaveKnx = async () => {
    try {
      await updateConfig({ knxIp: ip, knxPort: Number(port) });
      addToast('Connection settings saved', 'success');
      fetchConfig();
    } catch {
      addToast('Failed to save settings', 'error');
    }
  };

  const handleLoadDevConfig = async () => {
    try {
      const result = await loadDevConfig();
      if (result.success && result.config) {
        addToast('Dev Config loaded successfully', 'success');
        fetchConfig();
      } else {
        addToast(result.error || 'Failed to load dev config', 'error');
      }
    } catch {
      addToast('Failed to load dev config. Check backend connection.', 'error');
    }
  };

  // ── Hue ──────────────────────────────────────────────────────────────────────
  const handleHueDiscover = async () => {
    setHueStep('discovering'); setHueError('');
    try {
      const res = await discoverHueBridge();
      if (res.success && res.bridges.length > 0) {
        setHueBridgeIp(res.bridges[0].internalipaddress);
        setHueStep('found');
      } else {
        setHueError('No Hue Bridge found.');
        setHueStep('idle');
      }
    } catch {
      setHueError('Discovery failed. Is the backend running?');
      setHueStep('idle');
    }
  };

  const handleHuePair = async () => {
    setHueStep('pairing'); setHueError('');
    try {
      const res = await pairHueBridge(hueBridgeIp);
      if (res.success) {
        setHueStep('paired');
        setHueStatus({ paired: true, bridgeIp: hueBridgeIp });
        addToast('Hue Bridge paired!', 'success');
        fetchConfig();
      } else {
        setHueError(res.error || 'Pairing failed.');
        setHueStep('found');
      }
    } catch {
      setHueError('Pairing request failed.');
      setHueStep('found');
    }
  };

  const handleHueUnpair = async () => {
    try {
      await unpairHueBridge();
      setHueStatus({ paired: false, bridgeIp: '' });
      setHueBridgeIp('');
      setHueStep('idle');
      addToast('Hue Bridge unpaired', 'success');
      fetchConfig();
    } catch {
      addToast('Failed to unpair', 'error');
    }
  };

  // ── ETS XML ──────────────────────────────────────────────────────────────────
  const importGroupAddresses = async (addresses, fileName) => {
    try {
      await updateConfig({
        importedGroupAddresses: addresses,
        importedGroupAddressesFileName: fileName,
      });
      setGroupAddressBook(addresses);
      setGroupAddressFileName(fileName);
      addToast(`Imported ${addresses.length} group addresses`, 'success');
      fetchConfig();
    } catch {
      addToast('Failed to persist imported group addresses', 'error');
    }
  };

  const clearGroupAddresses = async () => {
    try {
      await updateConfig({ importedGroupAddresses: [], importedGroupAddressesFileName: '' });
      setGroupAddressBook([]);
      setGroupAddressFileName('');
      addToast('Imported group addresses cleared', 'success');
      fetchConfig();
    } catch {
      addToast('Failed to clear imported group addresses', 'error');
    }
  };

  const supportedCount = groupAddressBook.filter(a => a.supported).length;

  return (
    <div className="glass-panel settings-panel connections-page">

      {/* ── KNX Interface ─────────────────────────────────── */}
      <div className="connections-section" style={{ borderTop: 'none', marginTop: 0, paddingTop: '1.5rem' }}>
        <div className="connections-section-header">
          <div className="connections-section-icon knx-icon">
            <Plug size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>KNX Interface</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              IP address and port of your KNX IP interface.
            </p>
          </div>
        </div>

        <div className="knx-ip-row" style={{ marginTop: '1.25rem' }}>
          <div className="settings-field">
            <label className="settings-field-label">IP Address</label>
            <input
              className="form-input"
              placeholder="192.168.1.50"
              value={ip}
              onChange={e => setIp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKnx()}
            />
          </div>
          <div className="settings-field knx-port-field">
            <label className="settings-field-label">Port</label>
            <input
              className="form-input"
              type="number"
              placeholder="3671"
              value={port}
              onChange={e => setPort(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleSaveKnx}>
            <Save size={16} /> Save
          </button>
          <button
            className="btn-secondary"
            onClick={handleLoadDevConfig}
            title="Load local dev config (config.dev.json)"
          >
            Load Dev Config
          </button>
        </div>
      </div>

      {/* ── ETS XML ─────────────────────────────────────────── */}
      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon ets-icon">
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>ETS Group Address Import</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Upload your ETS XML export to browse compatible group addresses throughout the app.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => setGroupAddressModal({
              open: true,
              title: 'ETS XML import',
              allowUpload: true,
              mode: 'any',
              helperText: 'Upload an ETS XML export and review the imported supported addresses.'
            })}
          >
            <FileText size={15} /> Manage ETS XML
          </button>

          {groupAddressFileName && groupAddressBook.length > 0 && (
            <div className="ets-status-badge">
              <div className="ets-status-dot" />
              <span>
                <strong>{groupAddressFileName}</strong>
                {' · '}
                <span style={{ color: 'var(--text-secondary)' }}>{supportedCount} supported addresses</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Philips Hue ─────────────────────────────────────── */}
      <div className="connections-section">
        <div className="connections-section-header">
          <div className="connections-section-icon hue-icon">
            <Lightbulb size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Philips Hue</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Connect your Hue Bridge to control Hue lights alongside KNX.
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
              <button
                className="btn-danger"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                onClick={handleHueUnpair}
              >
                Unpair
              </button>
            </div>
          ) : (
            <div>
              {hueStep === 'idle' && (
                <div>
                  <button className="btn-primary" onClick={handleHueDiscover}>
                    <Sparkles size={14} /> Discover Bridge
                  </button>
                  <div style={{ marginTop: '1.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Or enter IP manually if discovery fails:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        className="form-input"
                        style={{ width: '180px' }}
                        placeholder="e.g. 192.168.1.100"
                        value={hueBridgeIp}
                        onChange={e => setHueBridgeIp(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => { if (hueBridgeIp) { setHueError(''); setHueStep('found'); } }}
                      >
                        Use IP
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {hueStep === 'discovering' && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching for Hue Bridges…</div>
              )}
              {hueStep === 'found' && (
                <div>
                  <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    Bridge found at <strong>{hueBridgeIp}</strong>
                  </p>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
                      👉 Press the <strong>Link button</strong> on your Hue Bridge, then click <strong>Pair</strong> within 30 seconds.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={handleHuePair} style={{ background: 'var(--success-color)' }}>Pair</button>
                    <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={() => setHueStep('idle')}>Cancel</button>
                  </div>
                </div>
              )}
              {hueStep === 'pairing' && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pairing…</div>
              )}
              {hueError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.75rem' }}>{hueError}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ETS Modal */}
      <KNXGroupAddressModal
        isOpen={groupAddressModal.open}
        title={groupAddressModal.title}
        addresses={groupAddressBook}
        importedFileName={groupAddressFileName}
        onClose={() => setGroupAddressModal(m => ({ ...m, open: false }))}
        onSelect={() => {}} // no selection in connections page
        onImport={importGroupAddresses}
        onClear={clearGroupAddresses}
        mode={groupAddressModal.mode}
        allowUpload={groupAddressModal.allowUpload}
        helperText={groupAddressModal.helperText}
      />
    </div>
  );
}
