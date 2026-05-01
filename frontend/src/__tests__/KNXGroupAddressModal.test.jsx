import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KNXGroupAddressModal } from '../components/KNXGroupAddressModal';

const ADDRESSES = [
  { id: 'switch', address: '1/1/2', name: 'Switch Status', functionType: 'switch', dpt: 'DPT1.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Lighting'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'switch-space', address: '1/1/3', name: 'Switch Status Space', functionType: 'switch', dpt: 'DPT 1.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Lighting'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'switch-dpst', address: '1/1/4', name: 'Switch Status DPST', functionType: 'switch', dpt: 'DPST-1-1', room: 'Living Room', rangePath: ['Wohnung Ost', 'Lighting'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'percentage', address: '2/1/6', name: 'Blind Position', functionType: 'percentage', dpt: 'DPT5.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Shades'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'scene', address: '3/5/4', name: 'Scene Control', functionType: 'scene', dpt: 'DPT17.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Scenes'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'temp-dpt', address: '5/1/1', name: 'Room Temperature', functionType: 'temperature', dpt: 'DPT9.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Climate'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'temp-space', address: '5/1/4', name: 'Room Temperature Space', functionType: 'temperature', dpt: 'DPT 9.001', room: 'Living Room', rangePath: ['Wohnung Ost', 'Climate'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'temp-plain', address: '5/1/2', name: 'Outside Temperature', functionType: 'temperature', dpt: '9.001', room: 'Outside', rangePath: ['Allgemeinbereich', 'Wetter'], topLevelRange: 'Allgemeinbereich', supported: true },
  { id: 'temp-dpst', address: '5/1/3', name: 'ETS Room Temperature', functionType: 'temperature', dpt: 'DPST-9-1', room: 'Bedroom', rangePath: ['Wohnung Ost', 'Climate'], topLevelRange: 'Wohnung Ost', supported: true },
  { id: 'temp-legacy', address: '5/1/5', name: 'Legacy Shared Temperature', dpt: 'DPST-9-1', room: 'Garage', rangePath: ['Allgemeinbereich', 'Wetter'], topLevelRange: 'Allgemeinbereich' },
  { id: 'unsupported', address: '9/9/9', name: 'Unsupported', functionType: 'switch', dpt: 'DPT99.999', room: 'Lab', rangePath: ['Lab', 'Unsupported'], topLevelRange: 'Lab', supported: false },
];

function renderModal(props = {}) {
  return render(
    <KNXGroupAddressModal
      isOpen={true}
      title="Select group address"
      addresses={ADDRESSES}
      importedFileName="ets.xml"
      onClose={vi.fn()}
      onSelect={vi.fn()}
      onImport={vi.fn()}
      onClear={vi.fn()}
      preferredTopLevelRangeName="Wohnung Ost"
      {...props}
    />
  );
}

describe('KNXGroupAddressModal — filtering', () => {
  it('filters switch mode to switch/status addresses only', () => {
    renderModal({ mode: 'switch' });

    expect(screen.getByText(/filtered list: switch\/status group addresses only/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status Space$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status DPST$/i)).toBeInTheDocument();
    expect(screen.queryByText(/blind position/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scene control/i)).not.toBeInTheDocument();
  });

  it('filters percentage mode to blind/percentage addresses only', () => {
    renderModal({ mode: 'percentage' });

    expect(screen.getByText(/filtered list: blind\/percentage group addresses only/i)).toBeInTheDocument();
    expect(screen.getByText(/blind position/i)).toBeInTheDocument();
    expect(screen.queryByText(/switch status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scene control/i)).not.toBeInTheDocument();
  });

  it('filters scene mode to scene addresses only', () => {
    renderModal({ mode: 'scene' });

    expect(screen.getByText(/filtered list: scene group addresses only/i)).toBeInTheDocument();
    expect(screen.getByText(/scene control/i)).toBeInTheDocument();
    expect(screen.queryByText(/switch status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/blind position/i)).not.toBeInTheDocument();
  });

  it('filters all supported 9.x DPT and DPST variants and shows the DPT filter badge', () => {
    renderModal({ mode: 'any', dptFilter: '9.' });

    expect(screen.getByText(/filtered list: matching dpt 9\.x only/i)).toBeInTheDocument();
    expect(screen.getByText(/^Room Temperature$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Room Temperature Space$/i)).toBeInTheDocument();
    expect(screen.getByText(/^ETS Room Temperature$/i)).toBeInTheDocument();
    expect(screen.queryByText(/outside temperature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Legacy Shared Temperature$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/switch status/i)).not.toBeInTheDocument();
  });

  it('filters all supported 1.x DPT and DPST variants and excludes non-matching types', () => {
    renderModal({ mode: 'any', dptFilter: '1.' });

    expect(screen.getByText(/filtered list: matching dpt 1\.x only/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status Space$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status DPST$/i)).toBeInTheDocument();
    expect(screen.queryByText(/room temperature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/outside temperature/i)).not.toBeInTheDocument();
  });

  it('shows the surrounding group range path instead of falling back to Unknown Room text', () => {
    renderModal({ mode: 'any', dptFilter: '9.', preferredTopLevelRangeName: '' });

    expect(screen.getAllByText('Allgemeinbereich / Wetter').length).toBeGreaterThan(0);
    expect(screen.queryByText(/unknown room/i)).not.toBeInTheDocument();
  });

  it('auto-selects the matching top-level group range for the current apartment', () => {
    renderModal();

    const filter = screen.getByRole('combobox', { name: /top-level group range/i });
    expect(filter).toHaveValue('Wohnung Ost');
    expect(screen.queryByText(/^Outside Temperature$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Switch Status$/i)).toBeInTheDocument();
  });

  it('allows filtering by a different top-level group range', async () => {
    const user = userEvent.setup();
    renderModal();

    const filter = screen.getByRole('combobox', { name: /top-level group range/i });
    await user.selectOptions(filter, 'Allgemeinbereich');

    expect(screen.getByText(/^Outside Temperature$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Switch Status$/i)).not.toBeInTheDocument();
  });

  it('shows the full imported list in upload mode, including non-selectable DPTs', () => {
    renderModal({ allowUpload: true, mode: 'any', dptFilter: null });

    expect(screen.queryByText(/unsupported group addresses hidden/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Unsupported$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Outside Temperature$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status$/i)).toBeInTheDocument();
  });

  it('does not auto-limit the top-level group range in upload mode', () => {
    renderModal({ allowUpload: true, mode: 'any', dptFilter: null });

    const filter = screen.getByRole('combobox', { name: /top-level group range/i });
    expect(filter).toHaveValue('all');
  });

  it('shows all group addresses in unrestricted picker mode when no DPT filter is given', () => {
    renderModal({ allowUpload: false, mode: 'any', dptFilter: null, preferredTopLevelRangeName: '' });

    expect(screen.getByText(/^Unsupported$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Outside Temperature$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Switch Status$/i)).toBeInTheDocument();
  });
});
