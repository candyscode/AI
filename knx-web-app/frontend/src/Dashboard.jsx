import React, { useState, useEffect, useRef } from 'react';
import { triggerAction } from './configApi';
import { Lightbulb, Gamepad2, Blinds } from 'lucide-react';

const BlindsCard = ({ func, istPosition, isMoving, onAction }) => {
  const [sollPosition, setSollPosition] = useState(istPosition !== undefined ? istPosition : 0);
  const initializedRef = useRef(false);
  const softwareCommandActiveRef = useRef(false);

  // React to Ist-position updates from the bus
  useEffect(() => {
    if (istPosition === undefined) return;

    // First real value after startup: sync Soll to Ist unconditionally
    if (!initializedRef.current) {
      initializedRef.current = true;
      softwareCommandActiveRef.current = false;
      setSollPosition(istPosition);
      return;
    }

    // If a software command is in flight: keep Soll fixed, don't follow Ist
    if (softwareCommandActiveRef.current) return;

    // No software command active: this is a wall-switch or external movement → follow Ist
    setSollPosition(istPosition);
  }, [istPosition]);

  // React to the "is moving" GA: when movement stops and we had a software command, clear the lock
  useEffect(() => {
    if (isMoving === false && softwareCommandActiveRef.current) {
      softwareCommandActiveRef.current = false;
    }
  }, [isMoving]);

  const handleChange = (e) => {
    setSollPosition(parseInt(e.target.value, 10));
  };

  const handlePointerUp = () => {
    softwareCommandActiveRef.current = true;
    onAction({ ...func, value: sollPosition });

    // Fallback: if no "is moving" GA is configured, auto-release lock after 3 minutes
    // (covers the longest possible blind travel time)
    if (!func.movingGroupAddress) {
      clearTimeout(softwareCommandActiveRef._timeout);
      softwareCommandActiveRef._timeout = setTimeout(() => {
        softwareCommandActiveRef.current = false;
      }, 180000);
    }
  };

  // If no movingGroupAddress configured, fall back to simpler flag-based logic
  // (once user interacts, Soll stays fixed)
  const hasMoveGA = !!func.movingGroupAddress;

  return (
    <div className="action-btn" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Blinds size={18} color="var(--accent-color)" />
        <span style={{ fontWeight: '600' }}>{func.name}</span>
        {isMoving && hasMoveGA && (
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginLeft: '0.25rem', animation: 'pulse 1s infinite' }}>⬆⬇ fährt…</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sollPosition}%</span>
      </div>
      <div className="blinds-widget">
        <div className="blinds-window">
          <div className="blinds-glass"></div>
          <div className="blinds-curtain" style={{ height: `${sollPosition}%` }}></div>
          <input 
            type="range" 
            className="blinds-slider" 
            min="0" 
            max="100" 
            value={sollPosition} 
            onChange={handleChange}
            onPointerUp={handlePointerUp}
            onTouchEnd={handlePointerUp}
          />
        </div>
        <div className="blinds-indicator-bar" title={`Ist-Position: ${istPosition}%`}>
          <div className="blinds-indicator-fill" style={{ height: `${istPosition}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard({ config, deviceStates = {}, addToast }) {
  const { rooms } = config;

  const handleAction = async (func) => {
    try {
      let valueToSend = func.value !== undefined ? func.value : true;
      if (func.type === 'switch' && func.value === undefined) {
        const currentState = !!deviceStates[func.statusGroupAddress];
        valueToSend = !currentState;
      }
      
      const res = await triggerAction({
        groupAddress: func.groupAddress,
        type: func.type,
        sceneNumber: func.sceneNumber,
        value: valueToSend
      });
      if(res.success) {
        if (func.type !== 'switch' && func.type !== 'percentage') {
          addToast(`Triggered ${func.name}`, 'success');
        }
      } else {
        addToast(`Failed: ${res.error}`, 'error');
      }
    } catch(e) {
      addToast(`Error communicating with backend`, 'error');
    }
  };

  if (!rooms || rooms.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>No rooms configured</h2>
        <p>Go to settings to add your first room and KNX functions.</p>
      </div>
    );
  }

  return (
    <div className="room-grid">
      {rooms.map((room) => (
        <div key={room.id} className="room-card">
          <div className="room-header">
            <h2>{room.name}</h2>
          </div>
          
          <div className="functions-grid">
            {room.functions.map((func) => {
              const currentState = deviceStates[func.statusGroupAddress];
              
              if (func.type === 'percentage') {
                const istPosition = currentState !== undefined ? currentState : 0;
                const isMoving = func.movingGroupAddress
                  ? deviceStates[func.movingGroupAddress]
                  : undefined;
                return (
                  <BlindsCard 
                    key={func.id} 
                    func={func} 
                    istPosition={istPosition}
                    isMoving={isMoving}
                    onAction={handleAction} 
                  />
                );
              }

              const isSwitch = func.type === 'switch';
              const isOn = isSwitch ? !!currentState : false;
              
              return (
                <button 
                  key={func.id} 
                  className="action-btn"
                  onClick={() => handleAction(func)}
                  style={isSwitch && isOn ? { borderColor: 'var(--success-color)' } : {}}
                >
                  <div style={{ color: isSwitch && isOn ? 'var(--success-color)' : 'var(--accent-color)', background: isSwitch && isOn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '50%', marginBottom: '0.25rem' }}>
                    {func.type === 'scene' ? <Gamepad2 size={24} /> : 
                     func.type === 'light' ? <Lightbulb size={24} /> : 
                     <Lightbulb size={24} />}
                  </div>
                  <span>{func.name}</span>
                  
                  {isSwitch && (
                    <div className={`toggle-switch ${isOn ? 'active' : ''}`}>
                      <div className="toggle-knob"></div>
                    </div>
                  )}
                </button>
              );
            })}
            {(!room.functions || room.functions.length === 0) && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No functions available
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
