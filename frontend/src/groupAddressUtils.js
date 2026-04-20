export function normalizeGroupAddress(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '');
}

export function findImportedGroupAddress(addressBook, value) {
  const normalizedValue = normalizeGroupAddress(value);
  if (!normalizedValue) return null;

  return (addressBook || []).find((entry) => normalizeGroupAddress(entry?.address) === normalizedValue) || null;
}

export function getImportedGroupAddressName(addressBook, value) {
  return findImportedGroupAddress(addressBook, value)?.name || '';
}
