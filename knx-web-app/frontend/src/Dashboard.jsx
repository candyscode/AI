import React, { useState, useEffect, useRef } from 'react';
import { triggerAction } from './configApi';
import { Lightbulb, Gamepad2, Blinds } from 'lucide-react';

const BlindsCard = ({ func, istPosition, onAction }) => {
  const [sollPosition, setSollPosition] = useState(istPosition !== undefined ? istPosition : 0);
  const targetSollRef = useRef(null);

  useEffect(() => {
    if (istPosition !== undefined && targetSollRef.current === null) {
      setSollPosition(istPosition);
    }
    
    // Unlock if we've reached our target (or very close to it due to rounding)
    if (istPosition !== undefined && targetSollRef.current !== null) {
      if (Math.abs(istPosition - targetSollRef.current) <= 2) {
        targetSollRef.current = null;
      }
    }
  }, [istPosition]);

  const handleChange = (e) => {
    setSollPosition(parseInt(e.target.value, 10));
  };

  const handlePointerUp = () => {
    targetSollRef.current = sollPosition;
    // Fallback unlock after 30 seconds if target precisely isn't reached
    setTimeout(() => { targetSollRef.current = null; }, 30000);
    onAction({ ...func, value: sollPosition });
  };

  return (
    <div className="action-btn" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Blinds size={18} color="var(--accent-color)" />
        <span style={{ fontWeight: '600' }}>{func.name}</span>
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
                return (
                  <BlindsCard 
                    key={func.id} 
                    func={func} 
                    istPosition={istPosition} 
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
