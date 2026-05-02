import { describe, expect, it } from 'vitest';
import {
  buildApartmentPath,
  buildApartmentView,
  createApartmentDraft,
  ensureUniqueSlug,
  migrateLegacyConfig,
  parseAppPath,
  slugifyApartmentName,
} from '../appModel';

describe('appModel path helpers', () => {
  it('builds bookmarkable apartment paths for dashboard and subpages', () => {
    expect(buildApartmentPath('wohnung-ost')).toBe('/wohnung-ost');
    expect(buildApartmentPath('wohnung-west', 'rooms')).toBe('/wohnung-west/rooms');
    expect(buildApartmentPath('wohnung-west', 'connections')).toBe('/wohnung-west/connections');
  });

  it('parses apartment slug and falls back to the first apartment', () => {
    const apartments = [{ slug: 'wohnung-ost' }, { slug: 'wohnung-west' }];

    expect(parseAppPath('/wohnung-west/rooms', apartments)).toEqual({
      apartmentSlug: 'wohnung-west',
      section: 'rooms',
    });

    expect(parseAppPath('/', apartments)).toEqual({
      apartmentSlug: 'wohnung-ost',
      section: 'dashboard',
    });
  });
});

describe('appModel migration and view building', () => {
  it('migrates legacy single-apartment config into building + apartments', () => {
    const migrated = migrateLegacyConfig({
      knxIp: '192.168.1.10',
      knxPort: 3671,
      floors: [{ id: 'floor-1', name: 'Ground Floor', rooms: [] }],
      globals: [
        { id: 'info-1', name: 'Outside Temperature', type: 'info', category: 'temperature' },
        { id: 'alarm-1', name: 'Rain Alarm', type: 'alarm', category: 'alarm' },
      ],
      importedGroupAddresses: [{ address: '1/1/1', name: 'Outside Temp', supported: true }],
      importedGroupAddressesFileName: 'legacy.xml',
    });

    expect(migrated.building.sharedInfos).toEqual([
      expect.objectContaining({ id: 'info-1', name: 'Outside Temperature', type: 'info' }),
    ]);
    expect(migrated.apartments[0].alarms).toEqual([
      expect.objectContaining({ id: 'alarm-1', name: 'Rain Alarm', type: 'alarm' }),
    ]);
    expect(migrated.apartments[0]).toEqual(expect.objectContaining({
      name: 'Wohnung 1',
      slug: 'wohnung-1',
      knxIp: '192.168.1.10',
    }));
    expect(migrated.building.importedGroupAddressesFileName).toBe('legacy.xml');
    expect(migrated.building.houseWideInfoReadApartmentId).toBe('apartment_1');
  });

  it('builds the merged apartment view with private and shared areas ordered by areaOrder', () => {
    const config = {
      version: 2,
      building: {
        houseWideInfoReadApartmentId: 'apartment_1',
        sharedInfos: [{ id: 'info-1', name: 'Outside Temperature', type: 'info', category: 'temperature' }],
        sharedAreas: [{ id: 'shared-garden', name: 'Garden', rooms: [] }],
        importedGroupAddresses: [{ address: '1/6/3', name: 'Outside Temperature', supported: true }],
        importedGroupAddressesFileName: 'house.xml',
      },
      apartments: [
        {
          id: 'apartment_1',
          name: 'Wohnung Ost',
          slug: 'wohnung-ost',
          knxIp: '192.168.1.10',
          knxPort: 3671,
          hue: { bridgeIp: '', apiKey: '' },
          floors: [
            { id: 'private-living', name: 'Living', rooms: [] },
            { id: 'private-sleeping', name: 'Sleeping', rooms: [] },
          ],
          areaOrder: ['shared-garden', 'private-sleeping', 'private-living'],
          alarms: [{ id: 'alarm-1', name: 'Rain Alarm', type: 'alarm', category: 'alarm' }],
          sunTrigger: { groupAddress: '1/6/0', dayValue: 1 },
          importedGroupAddresses: [],
          importedGroupAddressesFileName: '',
        },
      ],
    };

    const view = buildApartmentView(config, 'wohnung-ost');

    expect(view.apartment.name).toBe('Wohnung Ost');
    expect(view.apartmentConfig.floors.map((floor) => [floor.id, floor.isShared])).toEqual([
      ['shared-garden', true],
      ['private-sleeping', false],
      ['private-living', false],
    ]);
    expect(view.apartmentConfig.sharedInfos).toEqual([
      expect.objectContaining({ name: 'Outside Temperature' }),
    ]);
    expect(view.apartmentConfig.importedGroupAddresses).toEqual([
      expect.objectContaining({ address: '1/6/3', name: 'Outside Temperature' }),
    ]);
    expect(view.apartmentConfig.importedGroupAddressesFileName).toBe('house.xml');
    expect(view.apartmentConfig.alarms).toEqual([
      expect.objectContaining({ name: 'Rain Alarm' }),
    ]);
    expect(view.apartmentConfig.sunTrigger).toEqual({
      groupAddress: '1/6/0',
      dayValue: 1,
    });
    expect(view.apartmentConfig.houseWideInfoReadApartmentId).toBe('apartment_1');
  });

  it('normalizes legacy rooms without scenes/functions arrays in the apartment view', () => {
    const config = {
      version: 2,
      building: {
        houseWideInfoReadApartmentId: 'apartment_1',
        sharedInfos: [],
        sharedAreas: [{ id: 'shared-garden', name: 'Garden', rooms: [{ id: 'shared-room', name: 'Shared Room' }] }],
      },
      apartments: [
        {
          id: 'apartment_1',
          name: 'Wohnung Ost',
          slug: 'wohnung-ost',
          knxIp: '192.168.1.10',
          knxPort: 3671,
          hue: { bridgeIp: '', apiKey: '' },
          floors: [{ id: 'private-living', name: 'Living', rooms: [{ id: 'room-1', name: 'Legacy Room' }] }],
          areaOrder: ['private-living', 'shared-garden'],
          alarms: [],
          importedGroupAddresses: [],
          importedGroupAddressesFileName: '',
        },
      ],
    };

    const view = buildApartmentView(config, 'wohnung-ost');
    const privateRoom = view.apartmentConfig.floors.find((floor) => floor.id === 'private-living').rooms[0];
    const sharedRoom = view.apartmentConfig.floors.find((floor) => floor.id === 'shared-garden').rooms[0];

    expect(privateRoom.scenes).toEqual([]);
    expect(privateRoom.functions).toEqual([]);
    expect(sharedRoom.scenes).toEqual([]);
    expect(sharedRoom.functions).toEqual([]);
  });
});

describe('appModel apartment drafts and slugs', () => {
  it('slugifies umlauts and avoids duplicate slugs', () => {
    expect(slugifyApartmentName('Wohnung Süd')).toBe('wohnung-sued');
    expect(
      ensureUniqueSlug('wohnung-west', [
        { id: 'a1', slug: 'wohnung-west' },
        { id: 'a2', slug: 'wohnung-ost' },
      ])
    ).toBe('wohnung-west-2');
  });

  it('creates a new apartment draft with a unique slug and initial area', () => {
    const draft = createApartmentDraft(
      [{ id: 'apartment_1', slug: 'wohnung-west', name: 'Wohnung West' }],
      'Wohnung West'
    );

    expect(draft.name).toBe('Wohnung West');
    expect(draft.slug).toBe('wohnung-west-2');
    expect(draft.floors).toHaveLength(1);
    expect(draft.areaOrder).toEqual([draft.floors[0].id]);
    expect(draft.knxPort).toBe(3671);
  });
});
