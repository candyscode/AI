import React from 'react';

function Dashboard({ config, knxStatus, deviceStates, onDeviceUpdate, addToast }) {
  const { rooms = [] } = config;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🏠 KNX Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            knxStatus?.connected
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {knxStatus?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Welcome to KNX Dashboard</h2>
        <p className="text-blue-100">Connected to {config.knxIp}:{config.knxPort}</p>
      </div>

      {/* Room List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
        
        {rooms.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No rooms configured</p>
            <p className="text-sm text-gray-400 mt-1">
              Add rooms in the Settings tab
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{room.name}</h3>
                  <span className="text-xs text-gray-400">
                    {room.devices?.length || 0} devices
                  </span>
                </div>
                
                {/* Room Devices */}
                <div className="space-y-2">
                  {room.devices?.map((device) => {
                    const state = deviceStates[device.id];
                    return (
                      <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{device.name}</span>
                        <button
                          onClick={() => onDeviceUpdate(device.id, state?.value === 'on' ? 'off' : 'on')}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            state?.value === 'on'
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                        >
                          {state?.value === 'on' ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>KNX Status:</strong> {knxStatus?.msg || 'Unknown'}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
