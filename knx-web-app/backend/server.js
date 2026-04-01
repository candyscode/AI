const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const KnxService = require('./knxService');
const HueService = require('./hueService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json());

const CONFIG_FILE = path.join(__dirname, 'config.json');

const knxService = new KnxService(io);
const hueService = new HueService();

// Default empty config
let config = {
  knxIp: '',
  knxPort: 3671,
  hue: { bridgeIp: '', apiKey: '' },
  rooms: []
};

function establishConnection() {
  if (config.knxIp) {
    knxService.connect(config.knxIp, config.knxPort, () => {
      console.log('Orchestrating read requests for status GAs...');
      const statusGAs = new Set();
      const gaToType = {};
      
      config.rooms.forEach(room => {
        if (!room.functions) return;
        room.functions.forEach(func => {
          if (func.statusGroupAddress) {
            statusGAs.add(func.statusGroupAddress);
            gaToType[func.statusGroupAddress] = func.type;
          }
          if (func.groupAddress) {
            gaToType[func.groupAddress] = func.type;
          }
          // Register the "is moving" GA as a 1-bit type
          if (func.movingGroupAddress) {
            gaToType[func.movingGroupAddress] = 'moving';
          }
        });
      });
      
      knxService.setGaToType(gaToType);
      
      let delay = 0;
      statusGAs.forEach(ga => {
        setTimeout(() => knxService.readStatus(ga), delay);
        delay += 50; // Delay reads to prevent bus flooding
      });
    });
  }
}

// Load config
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(data);
    if (!config.knxPort) config.knxPort = 3671;
    if (!config.hue) config.hue = { bridgeIp: '', apiKey: '' };
    hueService.init(config.hue);
    establishConnection();
  } catch(e) {
    console.error('Error parsing config.json', e);
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Ensure the local file exists right away
if (!fs.existsSync(CONFIG_FILE)) {
  saveConfig();
}

// API Routes
app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const { knxIp, knxPort, rooms } = req.body;
  
  let shouldReconnect = false;

  if (knxIp !== undefined && config.knxIp !== knxIp) {
    config.knxIp = knxIp;
    shouldReconnect = true;
  }
  
  if (knxPort !== undefined && config.knxPort !== parseInt(knxPort)) {
    config.knxPort = parseInt(knxPort) || 3671;
    shouldReconnect = true;
  }

  if (shouldReconnect && config.knxIp) {
    establishConnection();
  }
  
  if (rooms !== undefined) {
    config.rooms = rooms;
  }
  
  saveConfig();
  res.json({ success: true, config });
});

// Action trigger
app.post('/api/action', (req, res) => {
  const { groupAddress, type, sceneNumber, value } = req.body;
  
  try {
    if (type === 'scene') {
      knxService.writeScene(groupAddress, sceneNumber);
    } else if (type === 'percentage') {
      // 0-100% -> 'DPT5.001'
      knxService.writeGroupValue(groupAddress, value, 'DPT5.001');
    } else {
      // type === 'switch' or other mapped to boolean True/False 1-bit
      knxService.writeGroupValue(groupAddress, (value === true || value === 1 || value === '1'), 'DPT1');
    }
    
    res.json({ success: true, message: `Sent to bus` });
  } catch (error) {
    console.error("Failed to execute action:", error.message);
    io.emit('knx_error', { msg: `Action failed on bus: ${error.message}` });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════ Hue API Routes ══════

app.post('/api/hue/discover', async (req, res) => {
  try {
    const bridges = await hueService.discoverBridges();
    res.json({ success: true, bridges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hue/pair', async (req, res) => {
  const { bridgeIp } = req.body;
  if (!bridgeIp) return res.status(400).json({ success: false, error: 'bridgeIp required' });

  const result = await hueService.pairBridge(bridgeIp);
  if (result.success) {
    config.hue = { bridgeIp, apiKey: result.apiKey };
    saveConfig();
    startHuePolling();
  }
  res.json(result);
});

app.post('/api/hue/unpair', (req, res) => {
  hueService.unpair();
  config.hue = { bridgeIp: '', apiKey: '' };
  saveConfig();
  stopHuePolling();
  res.json({ success: true });
});

app.get('/api/hue/lights', async (req, res) => {
  const result = await hueService.getLights();
  res.json(result);
});

app.post('/api/hue/action', async (req, res) => {
  const { lightId, on } = req.body;
  if (!lightId) return res.status(400).json({ success: false, error: 'lightId required' });

  const result = await hueService.setLightState(lightId, on);
  if (result.success) {
    // Immediately broadcast the state change to all connected clients
    io.emit('hue_state_update', { lightId: `hue_${lightId}`, on: !!on });
  }
  res.json(result);
});

// ── Hue state polling ──
let huePollingInterval = null;

function startHuePolling() {
  stopHuePolling();
  if (!hueService.isPaired) return;

  huePollingInterval = setInterval(async () => {
    // Collect all Hue light IDs referenced in rooms
    const hueIds = new Set();
    config.rooms.forEach(room => {
      (room.functions || []).forEach(f => {
        if (f.type === 'hue' && f.hueLightId) hueIds.add(f.hueLightId);
      });
    });
    if (hueIds.size === 0) return;

    const states = await hueService.getLightStates([...hueIds]);
    if (Object.keys(states).length > 0) {
      io.emit('hue_states', states);
    }
  }, 5000);
}

function stopHuePolling() {
  if (huePollingInterval) {
    clearInterval(huePollingInterval);
    huePollingInterval = null;
  }
}

// Start polling if already paired on boot
if (hueService.isPaired) {
  startHuePolling();
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected to UI');
  // Send current status to the newly connected frontend
  socket.emit('knx_status', { 
    connected: knxService.isConnected, 
    msg: knxService.isConnected ? 'Connected to bus' : (config.knxIp ? 'Disconnected from bus' : 'No KNX IP Configured') 
  });
  
  // Send Hue pairing status
  socket.emit('hue_status', { paired: hueService.isPaired, bridgeIp: hueService.bridgeIp });
  
  // Broadcast initial parsed KNX values (persisted + live)
  socket.emit('knx_initial_states', knxService.deviceStates);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
