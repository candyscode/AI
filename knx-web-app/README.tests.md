# Test Documentation – Feature List

This document lists all features in the KNX Control app that are covered by automated tests.

## Backend Features

### KNX Integration
- [x] Connect to KNX IP Gateway (MDT compatible)
- [x] Disconnect from KNX Gateway
- [x] Automatic reconnection on connection loss
- [x] Send DPT1 (Switch) values
- [x] Send DPT5 (Percentage/Dimmer) values  
- [x] Send DPT9 (Temperature/Float) values
- [x] Receive status updates from KNX bus
- [x] Event-based state updates

### Configuration API
- [x] Get/Update KNX Gateway IP settings
- [x] CRUD operations for rooms
- [x] CRUD operations for scenes
- [x] CRUD operations for functions
- [x] Floor management for rooms (KG, UG, EG, OG)
- [x] Configuration persistence

### Hue Integration
- [x] Discover Hue Bridges (SSDP/upnp)
- [x] Pair with Hue Bridge (link button flow)
- [x] Unpair from Hue Bridge
- [x] Get Hue lights, rooms, and scenes
- [x] Control Hue lights (on/off, brightness)
- [x] Activate Hue scenes

## Frontend Features

### Dashboard
- [x] Display rooms with scene and function counts
- [x] Collapsible room sections by floor
- [x] Quick scene activation
- [x] Switch control (toggle on/off)
- [x] Dimmer/Blind slider control
- [x] Hue light control with brightness
- [x] Real-time status updates via WebSocket
- [x] Toast notifications for errors

### Settings
- [x] KNX Gateway configuration (IP address)
- [x] Room management (add/edit/delete)
- [x] Floor assignment for rooms (dropdown)
- [x] Scene configuration (add/edit/delete)
- [x] Function assignment to scenes
- [x] Function type selection (Switch, Dimmer, Blind, Value)
- [x] Group address selection with KNX XML import
- [x] XML upload for ETS GroupAddress exports
- [x] Forget/Clear imported addresses
- [x] Search/filter in address modal
- [x] Hue Bridge discovery and pairing
- [x] Icon selection for functions
- [x] Drag & drop for reordering

### Connection Status
- [x] KNX connection indicator
- [x] Hue Bridge connection indicator
- [x] Real-time status updates

## Mock Services (for testing)

### Mock KNX Gateway
- [x] Simulates MDT KNX IP Gateway
- [x] Responds to connection requests
- [x] Simulates bus events
- [x] Handles multiple DPT types

### Mock Hue Bridge
- [x] Simulates Philips Hue Bridge API
- [x] Link button simulation
- [x] Returns mock lights, rooms, scenes
- [x] Handles pairing flow

## CI/CD Features

### GitHub Actions
- [x] Automated test runs on push
- [x] Backend tests with Jest
- [x] Frontend tests with Vitest
- [x] Coverage reports as artifacts
- [x] Node.js 20 environment

---

*Last updated: 2026-04-06*
