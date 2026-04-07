import test from 'node:test';
import assert from 'node:assert/strict';
import { getDropdownPosition, getSelectOption } from '../src/iconSelectUtils.js';

test('getSelectOption returns the matching option', () => {
  const options = [
    { value: 'lightbulb', label: 'Lamp' },
    { value: 'lock', label: 'Lock' },
  ];

  assert.deepEqual(getSelectOption(options, 'lock'), options[1]);
});

test('getSelectOption falls back to the first option', () => {
  const options = [
    { value: 'lightbulb', label: 'Lamp' },
    { value: 'lock', label: 'Lock' },
  ];

  assert.deepEqual(getSelectOption(options, 'missing'), options[0]);
});

test('getDropdownPosition opens below the trigger when space is available', () => {
  const style = getDropdownPosition(
    { left: 24, top: 100, bottom: 152, width: 180 },
    { height: 96 },
    { innerWidth: 1280, innerHeight: 900, scrollX: 0, scrollY: 0 },
  );

  assert.deepEqual(style, { left: '24px', top: '156px', width: '180px' });
});

test('getDropdownPosition flips above when there is not enough space below', () => {
  const style = getDropdownPosition(
    { left: 24, top: 180, bottom: 232, width: 180 },
    { height: 120 },
    { innerWidth: 1280, innerHeight: 240, scrollX: 0, scrollY: 0 },
  );

  assert.deepEqual(style, { left: '24px', top: '56px', width: '180px' });
});

test('getDropdownPosition clamps horizontally to stay inside the viewport', () => {
  const style = getDropdownPosition(
    { left: 350, top: 80, bottom: 132, width: 180 },
    { height: 100 },
    { innerWidth: 420, innerHeight: 800, scrollX: 0, scrollY: 0 },
  );

  assert.deepEqual(style, { left: '232px', top: '136px', width: '180px' });
});
