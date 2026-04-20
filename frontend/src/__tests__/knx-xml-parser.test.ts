import { describe, expect, it } from 'vitest';
import { parseKNXGroupAddressXML } from '../knx-xml-parser';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<KNX>
  <GroupAddresses>
    <GroupRange Name="Main">
      <GroupRange Name="Climate">
        <GroupAddress Name="Bad EG: Raumtemperatur" Address="3/6/3" DPTs="DPST-9-1" />
        <GroupAddress Name="Bad OG: Sollwertverschiebung" Address="3/1/0" DPTs="DPST-9-2" />
        <GroupAddress Name="Außenbereich: Außentemperatur" Address="1/0/1" DPTs="DPT 9.001" />
        <GroupAddress Name="Wohnbereich: Status Temperatur SOLLWERT" Address="3/7/26" DPTs="9.001" />
      </GroupRange>
      <GroupRange Name="Lights">
        <GroupAddress Name="Wohnbereich: Licht Schalten" Address="3/0/10" DPTs="DPST-1-1" />
        <GroupAddress Name="Büro: Raffstore Position (%)" Address="3/2/0" DPTs="DPST-5-1" />
        <GroupAddress Name="Büro: Szenen" Address="3/5/5" DPTs="DPST-17-1" />
        <GroupAddress Name="Datum / Uhrzeit" Address="3/6/0" DPTs="DPST-19-1" />
      </GroupRange>
    </GroupRange>
  </GroupAddresses>
</KNX>`;

describe('parseKNXGroupAddressXML', () => {
  it('marks 9.x DPT and DPST temperature-style addresses as supported', () => {
    const addresses = parseKNXGroupAddressXML(XML);

    expect(addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Bad EG: Raumtemperatur',
          dpt: 'DPST-9-1',
          functionType: 'temperature',
          supported: true,
          room: 'Bad EG',
        }),
        expect.objectContaining({
          name: 'Bad OG: Sollwertverschiebung',
          dpt: 'DPST-9-2',
          functionType: 'temperature',
          supported: true,
          room: 'Bad OG',
        }),
        expect.objectContaining({
          name: 'Außenbereich: Außentemperatur',
          dpt: 'DPT 9.001',
          functionType: 'temperature',
          supported: true,
          room: 'Außenbereich',
        }),
        expect.objectContaining({
          name: 'Wohnbereich: Status Temperatur SOLLWERT',
          dpt: '9.001',
          functionType: 'temperature',
          supported: true,
          room: 'Wohnbereich',
        }),
      ])
    );
  });

  it('keeps all DPT families used by the app supported and hides unrelated ones', () => {
    const addresses = parseKNXGroupAddressXML(XML);

    expect(addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Wohnbereich: Licht Schalten',
          functionType: 'switch',
          supported: true,
        }),
        expect.objectContaining({
          name: 'Büro: Raffstore Position (%)',
          functionType: 'percentage',
          supported: true,
        }),
        expect.objectContaining({
          name: 'Büro: Szenen',
          functionType: 'scene',
          supported: true,
        }),
        expect.objectContaining({
          name: 'Datum / Uhrzeit',
          supported: false,
        }),
      ])
    );
  });
});
