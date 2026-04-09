import { describe, expect, it } from 'vitest';
import { FLOOR_OPTIONS, groupRoomsByFloor, migrateRooms, moveRoomToFloor } from '../src/settingsRoomFloorUtils.js';

describe('settingsRoomFloorUtils', () => {
  it('migrateRooms assigns EG to rooms without a floor and preserves scene-ready rooms', () => {
    const migrated = migrateRooms([
      {
        id: 'living',
        name: 'Living Room',
        scenes: [],
        functions: [],
      },
    ]);

    expect(migrated[0].floor).toBe('EG');
    expect(migrated[0].scenes).toEqual([]);
  });

  it('migrateRooms converts legacy scene functions into room scenes', () => {
    const migrated = migrateRooms([
      {
        id: 'kitchen',
        name: 'Kitchen',
        functions: [
          { id: 'scene-off', type: 'scene', name: 'Off', groupAddress: '1/1/1', sceneNumber: 1 },
          { id: 'scene-bright', type: 'scene', name: 'Bright', groupAddress: '1/1/1', sceneNumber: 2 },
          { id: 'switch-main', type: 'switch', name: 'Main', groupAddress: '1/1/2' },
        ],
      },
    ]);

    expect(migrated[0].floor).toBe('EG');
    expect(migrated[0].sceneGroupAddress).toBe('1/1/1');
    expect(
      migrated[0].scenes.map((scene) => ({ name: scene.name, sceneNumber: scene.sceneNumber, category: scene.category })),
    ).toEqual([
      { name: 'Off', sceneNumber: 1, category: 'light' },
      { name: 'Bright', sceneNumber: 2, category: 'light' },
    ]);
    expect(migrated[0].functions.map((func) => func.id)).toEqual(['switch-main']);
  });

  it('groupRoomsByFloor pre-seeds all supported floors and groups rooms by floor', () => {
    const grouped = groupRoomsByFloor([
      { id: 'basement', floor: 'KG', name: 'Basement' },
      { id: 'office', floor: 'OG', name: 'Office' },
      { id: 'default-floor', name: 'Default Floor' },
    ]);

    expect(Object.keys(grouped)).toEqual(FLOOR_OPTIONS.map((option) => option.value));
    expect(grouped.KG.map((room) => room.id)).toEqual(['basement']);
    expect(grouped.OG.map((room) => room.id)).toEqual(['office']);
    expect(grouped.EG.map((room) => room.id)).toEqual(['default-floor']);
    expect(grouped.UG).toEqual([]);
  });

  it('moveRoomToFloor only updates the targeted room floor', () => {
    const rooms = [
      { id: 'living', floor: 'EG', name: 'Living Room' },
      { id: 'attic', floor: 'OG', name: 'Attic' },
    ];

    const moved = moveRoomToFloor(rooms, 'living', 'UG');

    expect(moved.map((room) => ({ id: room.id, floor: room.floor }))).toEqual([
      { id: 'living', floor: 'UG' },
      { id: 'attic', floor: 'OG' },
    ]);
    expect(rooms[0].floor).toBe('EG');
  });
});
