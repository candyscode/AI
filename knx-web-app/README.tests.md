# KNX Web App - Feature List

> This document lists all features currently implemented in the KNX Web App, as requested in Issue #24.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [KNX Features](#knx-features)
- [Philips Hue Features](#philips-hue-features)
- [Room Management](#room-management)
- [Scene Configuration](#scene-configuration)
- [Function Types](#function-types)
- [Dashboard](#dashboard)
- [Settings](#settings)

---

## Architecture Overview

- **Frontend**: React + Vite, served on `http://localhost:5173`
- **Backend**: Express + Socket.IO, served on `http://localhost:3001`
- **KNX Communication**: UDP multicast to KNX IP interface on port 3671
- **Hue Communication**: HTTP to Philips Hue Bridge on local LAN
- **Persistence**: All configuration stored in `backend/config.json`
- **Real-time Updates**: WebSocket events for live state synchronization

---

## KNX Features

### Connection Management
- Configure KNX IP interface address and port (default: 3671)
- Automatic connection establishment on startup
- Connection status indicator in header (connected/offline)
- Real-time connection state via WebSocket

### Group Address Actions
- **Write Actions**: Send values to KNX group addresses
  - Switch (DPT 1.001): Boolean on/off
  - Percentage/Blind (DPT 5.001): 0-100% values
  - Scene (DPT 17.001): Scene numbers 1-64
- **Read Actions**: Query status group addresses on connection startup

### State Management
- Real-time state updates from KNX bus via WebSocket
- Optimistic UI updates for immediate feedback
- Automatic state reversion on action failure
- Device state persistence across sessions

### Group Address Types Supported
| Type | DPT | Description |
|------|-----|-------------|
| Switch | DPT 1.001 | On/off toggle for lights, sockets, locks |
| Percentage | DPT 5.001 | 0-100% blind/roller shutter position |
| Scene | DPT 17.001 | Scene recall (1-64, 0-indexed on bus) |

---

## Philips Hue Features

### Bridge Discovery & Pairing
- **Auto-discovery**: Find Hue Bridge via `discovery.meethue.com`
- **Manual IP entry**: Enter bridge IP address directly
- **Pairing flow**: Press link button on bridge, then pair within 30 seconds
- **Status tracking**: Visual indicator showing paired/unpaired state
- **Unpairing**: Remove bridge credentials from configuration

### Light Management
- List all Hue lights from paired bridge
- Add Hue lamps to rooms (display name customizable)
- Real-time light state polling (every 5 seconds)
- Individual light on/off control
- Optimistic UI updates with reversion on failure

### Room Integration
- Link KNX rooms to Hue rooms
- Automatic "off" command to linked Hue room when scene named "Aus" or "Off" is triggered
- Display original Hue lamp name from bridge for reference

### Scene Integration
- Link KNX scenes to Hue scenes
- Automatic Hue scene activation when linked KNX scene is triggered
- Scene linking/unlinking via modal dialogs

### Hue API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `/api/hue/discover` | Auto-discover Hue Bridges |
| `/api/hue/pair` | Pair with bridge (requires link button) |
| `/api/hue/unpair` | Remove credentials |
| `/api/hue/lights` | Get all lights |
| `/api/hue/rooms` | Get all rooms |
| `/api/hue/scenes` | Get all scenes |
| `/api/hue/action` | Control individual lights |

---

## Room Management

### Room CRUD Operations
- **Create**: Add new rooms with custom names
- **Read**: View all configured rooms with their settings
- **Update**: Rename rooms, change floors, update configuration
- **Delete**: Remove rooms (with confirmation implied by action)

### Floor Organization
- Assign rooms to floors: KG (Keller), UG (Untergeschoss), EG (Erdgeschoss), OG (Obergeschoss)
- Collapsible floor sections in settings
- Visual floor badges on room headers
- Floor-based room grouping in settings UI

### Room Reordering
- Drag-and-drop room reordering within and across floors
- Touch-friendly drag sensors for mobile devices
- Persistent room order

### Room Properties
- Room ID (auto-generated timestamp)
- Room name (customizable)
- Floor assignment (KG/UG/EG/OG)
- Scene group address (shared by all room scenes)
- Scenes list
- Functions list
- Hue room link (optional)

---

## Scene Configuration

### Scene Types
- **Light Scenes**: For lighting control (colored pills in UI)
- **Shade Scenes**: For blind/roller shutter control (purple pills in UI)

### Scene Properties
- Scene ID (auto-generated)
- Scene name (e.g., "Aus", "Hell", "Kochen", "Relax")
- Scene number (1-64, mapped to 0-63 on KNX bus)
- Category (light or shade)
- Optional Hue scene link

### Scene Management
- Add new scenes (light or shade category)
- Delete scenes
- Update scene name and number
- Drag-and-drop scene reordering within rooms
- Generate base scenes ("Off" and "Bright") automatically

### Scene Actions
- Trigger via dashboard scene pills
- Trigger via KNX bus (external wall switches)
- Cascading Hue scene activation when linked

### Scene Linking
- Link scenes to Hue scenes for synchronized activation
- Unlink Hue scenes
- Visual indicator for linked scenes (lightbulb icon)

---

## Function Types

### Switch Function
- **Purpose**: On/off control for lights, sockets, locks
- **DPT**: DPT 1.001
- **Group Addresses**:
  - Action GA: Address to write commands to
  - Feedback GA: Address where actuator reports status
- **Features**:
  - Icon selection (lightbulb, lock)
  - Icon inversion option (for lock states)
  - Toggle switch UI with visual state
  - Optimistic updates

### Blind/Percentage Function
- **Purpose**: Roller shutter/blind position control
- **DPT**: DPT 5.001 (0-100%)
- **Group Addresses**:
  - Action GA: Position commands
  - Feedback GA: Current position reports
  - Moving GA (optional): Signals when blind is in motion
- **Features**:
  - Slider widget with visual blind representation
  - Separate Soll (setpoint) and Ist (actual) positions
  - Movement indicator animation
  - Drag to set position
  - Indicator bar showing actual position

### Scene Function (Standalone)
- **Purpose**: Individual scene triggers separate from room scenes
- **DPT**: DPT 17.001
- **Group Addresses**:
  - Action GA: Scene trigger address
- **Features**:
  - Scene number input (1-64)
  - Trigger button in dashboard

### Hue Lamp Function
- **Purpose**: Control Philips Hue lights alongside KNX devices
- **Properties**:
  - Display name (customizable)
  - Original Hue name (from bridge, read-only)
  - Hue light ID
  - Icon type
- **Features**:
  - Toggle on/off
  - Visual state indicator
  - Purple-tinted card with HUE badge
  - Optimistic UI updates

### Function Management
- Add functions to rooms
- Delete functions
- Update all function properties
- Drag-and-drop function reordering within rooms
- Type selection with DPT information display

---

## Dashboard

### Layout
- Grid of room cards
- Responsive design for desktop and mobile
- Dark theme with glass-morphism cards

### Room Card Contents
- Room name header
- Scene categories (Lights and Shades)
- Scene pills for quick activation
- Functions grid

### Scene Pills
- Light scenes: Colored pills
- Shade scenes: Purple pills
- One-click scene activation
- Toast notification on trigger

### Function Widgets

#### Switch Widget
- Icon (lightbulb or lock)
- Function name
- Toggle switch visual
- Active/inactive state styling
- Optimistic state updates

#### Blind Widget
- Blind icon
- Function name
- Position percentage display
- Interactive slider
- Visual blind representation (curtain height)
- Position indicator bar (Ist-Position)
- Movement animation

#### Hue Widget
- Lightbulb icon
- Custom display name
- Toggle switch
- Purple HUE badge
- Active/inactive state
- Optimistic updates

### Quick Actions
- All controls accessible in single view
- No page reload required (SPA behavior)
- Toast notifications for user feedback
- Error handling with automatic state reversion

### Empty States
- "No rooms configured" message when no rooms exist
- Guidance to visit settings

---

## Settings

### KNX Interface Settings
- IP address input
- Port input (default 3671)
- Save button
- Connection status indicator
- Validation and error handling

### Philips Hue Settings
- Discovery status display
- Bridge IP input (manual or discovered)
- Pair/Unpair controls
- Pairing instructions with link button guidance
- Paired status with bridge IP display

### Room & Function Settings

#### Room Section
- Create new room input
- Floor-based room organization
- Expandable/collapsible floor sections
- Expandable/collapsible room cards
- Room deletion
- Floor assignment dropdown

#### Scene Configuration Section
- Scene group address input
- Light scenes list with drag-and-drop
- Shade scenes list with drag-and-drop
- Add scene buttons (light/shade)
- Scene name and number fields
- Generate base scenes helper
- Hue scene linking (when bridge paired)

#### Functions Section
- Add function button
- Add Hue lamp button (when bridge paired)
- Function cards with:
  - Drag handle for reordering
  - Type badge
  - Name field
  - Type selector with DPT info
  - Group address fields
  - Icon selector (for switches)
  - Invert checkbox (for switches)
  - Delete button
- Drag-and-drop function reordering

### Modal Dialogs

#### Hue Lamp Selection
- Search/filter Hue lamps
- Lamp list with status indicators
- One-click selection
- Cancel option

#### Hue Room Linking
- Search/filter Hue rooms
- Room list with light count
- Link/unlink controls
- Information about "Aus"/"Off" scene behavior

#### Hue Scene Linking
- Search/filter Hue scenes
- Scene list with group info
- Link/unlink controls
- Information about scene synchronization

### Persistence
- Save All Changes button per room
- Automatic config.json updates
- Toast notifications for save success/failure
- LocalStorage for UI preferences (expanded floors/rooms)

### UI Preferences (LocalStorage)
- Expanded floor states
- Expanded room states
- Persisted across sessions

---

## WebSocket Events

### Backend → Frontend Events
| Event | Payload | Description |
|-------|---------|-------------|
| `knx_status` | `{ connected, msg }` | KNX connection state change |
| `knx_initial_states` | `{ [ga]: value }` | Full state snapshot on connect |
| `knx_state_update` | `{ groupAddress, value }` | Single GA state change |
| `knx_error` | `{ msg }` | KNX error message |
| `hue_status` | `{ paired, bridgeIp }` | Hue pairing state |
| `hue_states` | `{ [id]: boolean }` | Full Hue state snapshot |
| `hue_state_update` | `{ lightId, on }` | Single Hue light change |

---

## REST API Endpoints

### Configuration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Get full configuration |
| POST | `/api/config` | Save configuration |
| GET | `/api/floors` | Get floor options list |
| POST | `/api/config/rooms/:roomId/floor` | Update room floor |

### KNX Actions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/action` | Send value to group address |

### Hue Integration
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/hue/discover` | Discover Hue bridges |
| POST | `/api/hue/pair` | Pair with bridge |
| POST | `/api/hue/unpair` | Unpair bridge |
| GET | `/api/hue/lights` | List Hue lights |
| GET | `/api/hue/rooms` | List Hue rooms |
| GET | `/api/hue/scenes` | List Hue scenes |
| POST | `/api/hue/action` | Control Hue light |
| POST | `/api/config/rooms/:roomId/hue-room` | Link Hue room |
| DELETE | `/api/config/rooms/:roomId/hue-room` | Unlink Hue room |
| POST | `/api/config/scenes/:sceneId/hue-scene` | Link Hue scene |
| DELETE | `/api/config/scenes/:sceneId/hue-scene` | Unlink Hue scene |

---

## File Structure

```
knx-web-app/
├── backend/
│   ├── server.js          # Express API + Socket.IO
│   ├── knxService.js      # KNX IP connection
│   ├── hueService.js      # Philips Hue integration
│   └── config.json        # Runtime configuration
└── frontend/
    └── src/
        ├── App.jsx         # Root component
        ├── Dashboard.jsx   # Dashboard view
        ├── Settings.jsx    # Settings view
        ├── configApi.js    # API client
        └── index.css       # Styling
```

---

## Notes

- **Optimistic UI**: Switch and Hue toggles update immediately, reverting on failure
- **KNX Scene Offset**: Scene numbers 1-64 are automatically converted to 0-63 on bus (DPT 17.001 standard)
- **Hue HTTP**: Uses HTTP (not HTTPS) for local bridge communication due to self-signed certificates
- **Port Conflicts**: If Vite starts on port 5174, kill stale processes with `pkill -f "vite"`
- **Floor Default**: New rooms default to EG (Erdgeschoss)
