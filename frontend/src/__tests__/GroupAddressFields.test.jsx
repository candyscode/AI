import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalsConfig from '../components/GlobalsConfig';
import { GAField } from '../components/CollapsibleRoomCard';
import { getImportedGroupAddressName } from '../groupAddressUtils';

describe('groupAddressUtils', () => {
  it('matches manually typed group addresses to imported XML names', () => {
    const addressBook = [
      { address: '3/6/3', name: 'Bad EG: Raumtemperatur' },
      { address: '1/1/1', name: 'Außentemperatur' },
    ];

    expect(getImportedGroupAddressName(addressBook, ' 3/6/3 ')).toBe('Bad EG: Raumtemperatur');
    expect(getImportedGroupAddressName(addressBook, '1/1/1')).toBe('Außentemperatur');
    expect(getImportedGroupAddressName(addressBook, '9/9/9')).toBe('');
  });
});

describe('group address name hints', () => {
  it('shows the imported XML name below room GA fields', () => {
    render(
      <GAField
        label="Room Temperature GA"
        value="3/6/3"
        onChange={vi.fn()}
        matchedAddressName="Bad EG: Raumtemperatur"
      />
    );

    expect(screen.getByText('XML match:')).toBeInTheDocument();
    expect(screen.getByText('Bad EG: Raumtemperatur')).toBeInTheDocument();
  });

  it('shows imported XML names below shared info and alarm GA fields', () => {
    render(
      <GlobalsConfig
        sharedInfos={[{
          id: 'info-1',
          name: 'Outside Temperature',
          type: 'info',
          category: 'temperature',
          statusGroupAddress: '1/1/1',
        }]}
        apartmentAlarms={[{
          id: 'alarm-1',
          name: 'Rain Alarm',
          type: 'alarm',
          category: 'alarm',
          statusGroupAddress: '2/1/1',
        }]}
        setSharedInfos={vi.fn()}
        setApartmentAlarms={vi.fn()}
        saveSharedInfos={vi.fn()}
        saveApartmentAlarms={vi.fn()}
        openGroupAddressModal={vi.fn()}
        requestConfirm={vi.fn()}
        resolveGroupAddressName={(address, type) => {
          if (type === 'alarm' && address === '2/1/1') return 'Regenalarm';
          if (type === 'info' && address === '1/1/1') return 'Außentemperatur';
          return '';
        }}
      />
    );

    expect(screen.getByText('Außentemperatur')).toBeInTheDocument();
    expect(screen.getByText('Regenalarm')).toBeInTheDocument();
  });
});
