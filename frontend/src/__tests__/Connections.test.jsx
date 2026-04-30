import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Connections from '../Connections';
import * as api from '../configApi';
import { buildApartmentView } from '../appModel';

vi.mock('../configApi', () => ({
  updateConfig: vi.fn(),
  verifyConfigPassword: vi.fn(),
  setConfigPassword: vi.fn(),
  removeConfigPassword: vi.fn(),
  discoverHueBridge: vi.fn(),
  pairHueBridge: vi.fn(),
  unpairHueBridge: vi.fn(),
  loadDevConfig: vi.fn(),
}));

vi.mock('../components/KNXGroupAddressModal', () => ({
  KNXGroupAddressModal: ({ isOpen, title, helperText, onImport, onClear }) => (
    isOpen ? (
      <div data-testid="knx-group-address-modal">
        <div>{title}</div>
        <div>{helperText}</div>
        <button
          onClick={() => onImport?.([{ address: '1/2/3', name: 'Imported Address', supported: true }], `${title}.xml`)}
        >
          Import mock XML
        </button>
        <button onClick={() => onClear?.()}>Clear mock XML</button>
      </div>
    ) : null
  ),
}));

const addToast = vi.fn();
const fetchConfig = vi.fn();
const applyConfig = vi.fn();
const navigateToApartment = vi.fn();
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const anchorClick = vi.fn();
const realCreateElement = document.createElement.bind(document);
const hasTextContent = (matcher) => (_, node) => matcher.test(node?.textContent || '');

const FULL_CONFIG = {
  version: 2,
  building: {
    sharedAccessApartmentId: 'apartment_1',
    sharedUsesApartmentImportedGroupAddresses: false,
    sharedInfos: [{ id: 'info-1', name: 'Outside Temperature', type: 'info', category: 'temperature' }],
    sharedAreas: [{ id: 'shared-garden', name: 'Garden', rooms: [] }],
    sharedImportedGroupAddresses: [{ address: '1/7/1', name: 'Garden Weather', supported: true }],
    sharedImportedGroupAddressesFileName: 'shared.xml',
  },
  apartments: [
    {
      id: 'apartment_1',
      name: 'Wohnung Ost',
      slug: 'wohnung-ost',
      knxIp: '192.168.1.10',
      knxPort: 3671,
      hue: { bridgeIp: '', apiKey: '' },
      floors: [{ id: 'living', name: 'Living', rooms: [] }],
      areaOrder: ['living', 'shared-garden'],
      alarms: [{ id: 'alarm-1', name: 'Rain Alarm', type: 'alarm', category: 'alarm' }],
      importedGroupAddresses: [{ address: '2/1/1', name: 'East Line', supported: true }],
      importedGroupAddressesFileName: 'ost.xml',
    },
    {
      id: 'apartment_2',
      name: 'Wohnung West',
      slug: 'wohnung-west',
      knxIp: '192.168.1.20',
      knxPort: 3671,
      hue: { bridgeIp: '', apiKey: '' },
      floors: [{ id: 'west-floor', name: 'West Floor', rooms: [] }],
      areaOrder: ['west-floor', 'shared-garden'],
      alarms: [],
      importedGroupAddresses: [],
      importedGroupAddressesFileName: '',
    },
  ],
};

function renderConnections(fullConfig = FULL_CONFIG, apartmentSlug = 'wohnung-ost') {
  const { apartment, apartmentConfig } = buildApartmentView(fullConfig, apartmentSlug);

  return render(
    <Connections
      fullConfig={fullConfig}
      apartment={apartment}
      config={apartmentConfig}
      fetchConfig={fetchConfig}
      applyConfig={applyConfig}
      addToast={addToast}
      knxStatus={{ connected: true, msg: 'ok' }}
      sharedKnxStatus={{ connected: false, msg: 'offline' }}
      hueStatus={{ paired: false, bridgeIp: '' }}
      navigateToApartment={navigateToApartment}
      configProtectionEnabled={fullConfig.building?.configProtectionEnabled === true}
      onConfigUnlocked={vi.fn()}
      onConfigLockRemoved={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  anchorClick.mockReset();
  api.updateConfig.mockImplementation(async (nextConfig) => ({ success: true, config: nextConfig }));
  api.verifyConfigPassword.mockResolvedValue({ success: true });
  api.setConfigPassword.mockResolvedValue({ success: true, config: { ...FULL_CONFIG, building: { ...FULL_CONFIG.building, configProtectionEnabled: true } } });
  api.removeConfigPassword.mockResolvedValue({ success: true, config: { ...FULL_CONFIG, building: { ...FULL_CONFIG.building, configProtectionEnabled: false } } });
  api.discoverHueBridge.mockResolvedValue({ success: true, bridges: [{ internalipaddress: '192.168.1.65' }] });
  api.pairHueBridge.mockResolvedValue({ success: true, apiKey: 'new-api-key' });
  api.unpairHueBridge.mockResolvedValue({ success: true });
  api.loadDevConfig.mockResolvedValue({ success: true });
  URL.createObjectURL = vi.fn(() => 'blob:config');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'a') {
      const anchor = realCreateElement('a');
      anchor.click = anchorClick;
      return anchor;
    }
    return realCreateElement(tagName);
  });
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  document.createElement.mockRestore?.();
});

describe('Connections — multi-apartment setup grouping', () => {
  it('renders the setup page with apartment, main line, and management groups', () => {
    renderConnections();

    expect(screen.getByText('Building Setup')).toBeInTheDocument();
    expect(screen.getByText('Current Apartment')).toBeInTheDocument();
    expect(screen.getByText('Main Line Setup')).toBeInTheDocument();
    expect(screen.getByText('Manage Apartments')).toBeInTheDocument();
    expect(screen.getAllByText(/Main Line via Wohnung Ost offline/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /save apartment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save shared setup/i })).not.toBeInTheDocument();
  });

  it('makes clear that main line ETS setup is building-wide even when another apartment is selected', () => {
    renderConnections(FULL_CONFIG, 'wohnung-west');

    expect(screen.getByText(/ets xml for main line and central knx group addresses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/main line access uses wohnung ost/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not this apartment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(hasTextContent(/edit this in wohnung ost only/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('checkbox', { name: /use main line apartment's ets xml/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage main line ets xml/i })).not.toBeInTheDocument();
  });
});

describe('Connections — configuration password', () => {
  it('enables the configuration password from setup', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.type(screen.getByPlaceholderText(/enter a password/i), 'familie');
    await user.type(screen.getByPlaceholderText(/enter the password again/i), 'familie');
    await user.click(screen.getByRole('button', { name: /enable password/i }));

    await waitFor(() => {
      expect(api.setConfigPassword).toHaveBeenCalledWith('familie');
    });
  });

  it('re-prompts for the current password before removing it', async () => {
    const user = userEvent.setup();
    renderConnections({
      ...FULL_CONFIG,
      building: {
        ...FULL_CONFIG.building,
        configProtectionEnabled: true,
      },
    });

    await user.click(screen.getByRole('button', { name: /remove password/i }));
    const dialog = screen.getByText('Remove Configuration Password').closest('.modal-content');
    await user.type(within(dialog).getByPlaceholderText(/enter password/i), 'familie');
    await user.click(within(dialog).getByRole('button', { name: /remove password/i }));

    await waitFor(() => {
      expect(api.verifyConfigPassword).toHaveBeenCalledWith('familie');
      expect(api.removeConfigPassword).toHaveBeenCalledWith('familie');
    });
  });
});

describe('Connections — apartment-specific persistence', () => {
  it('auto-saves the current apartment identity and gateway settings on blur', async () => {
    renderConnections();

    const identityHeading = screen.getByText('Identity & KNX Gateway');
    const identityCard = identityHeading.closest('section');
    const [nameInput, slugInput, ipInput] = within(identityCard).getAllByRole('textbox');
    const portInput = within(identityCard).getByRole('spinbutton');

    fireEvent.change(nameInput, { target: { value: 'Wohnung Ost Neu' } });
    fireEvent.change(slugInput, { target: { value: 'wohn-ost-neu' } });
    fireEvent.change(ipInput, { target: { value: '192.168.50.10' } });
    fireEvent.change(portInput, { target: { value: '3675' } });
    fireEvent.blur(portInput);

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        building: expect.objectContaining({
          sharedAccessApartmentId: 'apartment_1',
          sharedImportedGroupAddressesFileName: 'shared.xml',
        }),
        apartments: expect.arrayContaining([
          expect.objectContaining({
            id: 'apartment_1',
            name: 'Wohnung Ost Neu',
            slug: 'wohn-ost-neu',
            knxIp: '192.168.50.10',
            knxPort: 3675,
          }),
          expect.objectContaining({
            id: 'apartment_2',
            name: 'Wohnung West',
            slug: 'wohnung-west',
          }),
        ]),
      }));
    });
    expect(addToast).not.toHaveBeenCalledWith('Apartment settings saved', 'success');
  });

  it('persists the sun trigger GA and bus selection without resetting them', async () => {
    const user = userEvent.setup();
    renderConnections();

    const sunTriggerCard = screen.getByText('Sunrise / Sunset Trigger').closest('section');
    const [busSelect] = within(sunTriggerCard).getAllByRole('combobox');
    await user.selectOptions(busSelect, 'main');
    const gaInput = within(sunTriggerCard).getByPlaceholderText('e.g. 7/0/0');
    await user.clear(gaInput);
    await user.type(gaInput, '1/6/0');
    fireEvent.blur(gaInput);

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        apartments: expect.arrayContaining([
          expect.objectContaining({
            id: 'apartment_1',
            sunTrigger: expect.objectContaining({
              groupAddress: '1/6/0',
              bus: 'main',
              dayValue: 1,
            }),
          }),
        ]),
      }));
    });
  });

  it('shows the XML match for the sun trigger group address from the selected XML scope', async () => {
    const user = userEvent.setup();
    renderConnections();

    const sunTriggerCard = screen.getByText('Sunrise / Sunset Trigger').closest('section');
    const [busSelect] = within(sunTriggerCard).getAllByRole('combobox');
    await user.selectOptions(busSelect, 'main');

    const gaInput = within(sunTriggerCard).getByPlaceholderText('e.g. 7/0/0');
    await user.clear(gaInput);
    await user.type(gaInput, '1/7/1');

    expect(within(sunTriggerCard).getByText('XML match:')).toBeInTheDocument();
    expect(within(sunTriggerCard).getByText('Garden Weather')).toBeInTheDocument();
  });

  it('opens the apartment ETS modal and persists imported addresses in the apartment scope', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.click(screen.getByRole('button', { name: /manage apartment ets xml/i }));
    expect(screen.getByTestId('knx-group-address-modal')).toBeInTheDocument();
    expect(screen.getByText('Apartment ETS XML import')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /import mock xml/i }));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        apartments: expect.arrayContaining([
          expect.objectContaining({
            id: 'apartment_1',
            importedGroupAddresses: [expect.objectContaining({ address: '1/2/3', name: 'Imported Address' })],
            importedGroupAddressesFileName: 'Apartment ETS XML import.xml',
          }),
        ]),
        building: expect.objectContaining({
          sharedImportedGroupAddressesFileName: 'shared.xml',
        }),
      }));
    });
  });
});

describe('Connections — main line setup', () => {
  it('auto-saves which apartment provides main line KNX access', async () => {
    const user = userEvent.setup();
    renderConnections();

    const accessCard = screen.getByText('Main Line Access').closest('section');
    await user.selectOptions(within(accessCard).getByRole('combobox'), 'apartment_2');

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        building: expect.objectContaining({
          sharedAccessApartmentId: 'apartment_2',
        }),
      }));
    });
    expect(addToast).not.toHaveBeenCalledWith('Main line settings saved', 'success');
  });

  it('opens the main line ETS modal and persists imported addresses in the building scope', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.click(screen.getByRole('button', { name: /manage main line ets xml/i }));
    expect(screen.getByText('Main Line ETS XML import')).toBeInTheDocument();
    expect(screen.getByText(/upload the ets xml for the main line and central functions/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /import mock xml/i }));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        building: expect.objectContaining({
          sharedImportedGroupAddresses: [expect.objectContaining({ address: '1/2/3', name: 'Imported Address' })],
          sharedImportedGroupAddressesFileName: 'Main Line ETS XML import.xml',
        }),
        apartments: expect.arrayContaining([
          expect.objectContaining({
            id: 'apartment_1',
            importedGroupAddressesFileName: 'ost.xml',
          }),
        ]),
      }));
    });
  });

  it('can switch main line browsing to the apartment ETS XML and clears dedicated main line XML after confirmation', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.click(screen.getByRole('checkbox', { name: /use main line apartment's ets xml/i }));
    expect(screen.getByText('Use Main Line Apartment ETS XML')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use Main Line XML' }));

    expect(screen.queryByRole('button', { name: /manage main line ets xml/i })).not.toBeInTheDocument();
    expect(screen.getByText(/using wohnung ost's apartment xml for main line browsing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        building: expect.objectContaining({
          sharedUsesApartmentImportedGroupAddresses: true,
          sharedImportedGroupAddresses: [],
          sharedImportedGroupAddressesFileName: '',
        }),
      }));
    });
  });

  it('renders the main line ETS card as read-only when another apartment provides main line access', () => {
    renderConnections(FULL_CONFIG, 'wohnung-west');

    expect(screen.getAllByText(hasTextContent(/edit this in wohnung ost only/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/shared\.xml/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /use main line apartment's ets xml/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage main line ets xml/i })).not.toBeInTheDocument();
  });
});

describe('Connections — apartment management', () => {
  it('navigates to another apartment from the apartment list', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.click(screen.getByRole('button', { name: /wohnung west/i }));

    expect(navigateToApartment).toHaveBeenCalledWith('wohnung-west');
  });

  it('creates a new apartment with a unique slug and navigates there', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.type(screen.getByPlaceholderText('e.g. Wohnung West'), 'Wohnung West');
    await user.click(screen.getByRole('button', { name: /create apartment/i }));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
        apartments: expect.arrayContaining([
          expect.objectContaining({ id: 'apartment_1', slug: 'wohnung-ost' }),
          expect.objectContaining({ id: 'apartment_2', slug: 'wohnung-west' }),
          expect.objectContaining({
            name: 'Wohnung West',
            slug: 'wohnung-west-2',
            floors: [expect.objectContaining({ name: 'Ground Floor' })],
          }),
        ]),
      }));
    });

    expect(navigateToApartment).toHaveBeenCalledWith('wohnung-west-2');
    expect(addToast).toHaveBeenCalledWith('Apartment "Wohnung West" created', 'success');
  });
});

describe('Connections — full config backup', () => {
  it('exports the full config as a downloadable JSON file', async () => {
    const user = userEvent.setup();
    renderConnections();

    await user.click(screen.getByRole('button', { name: /export full config/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:config');
    expect(addToast).toHaveBeenCalledWith('Config exported', 'success');
  });

  it('imports a full config after confirmation and navigates to the imported apartment', async () => {
    const user = userEvent.setup();
    renderConnections();

    const importInput = document.querySelector('input[type="file"][accept*="application/json"]');
    const importedConfig = {
      version: 2,
      building: {
        sharedAccessApartmentId: 'apartment_99',
        sharedUsesApartmentImportedGroupAddresses: false,
        sharedInfos: [],
        sharedAreas: [],
        sharedImportedGroupAddresses: [],
        sharedImportedGroupAddressesFileName: '',
      },
      apartments: [
        {
          id: 'apartment_99',
          name: 'Imported Apartment',
          slug: 'imported-apartment',
          knxIp: '10.0.0.5',
          knxPort: 3671,
          hue: { bridgeIp: '', apiKey: '' },
          floors: [],
          areaOrder: [],
          alarms: [],
          importedGroupAddresses: [],
          importedGroupAddressesFileName: '',
        },
      ],
    };

    await user.upload(importInput, new File([JSON.stringify(importedConfig)], 'config.json', { type: 'application/json' }));
    expect(screen.getByRole('heading', { name: 'Import Full Config' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import Config' }));

    await waitFor(() => {
      expect(api.updateConfig).toHaveBeenCalledWith(importedConfig);
    });
    expect(navigateToApartment).toHaveBeenCalledWith('imported-apartment');
    expect(addToast).toHaveBeenCalledWith('Config imported successfully', 'success');
  });
});
