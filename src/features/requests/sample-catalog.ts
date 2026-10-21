// Owner-authorized design examples. Never seed these into the shared catalog.
export const sampleCatalog = {
  machine: [
    { id: 'sample-3d', label: '3D printing — sample service' },
    { id: 'sample-laser', label: 'Laser cutting — sample service' },
    { id: 'sample-machine-other', label: 'Other machine support — sample service' },
  ],
  operations: [
    { id: 'sample-components', label: 'Component support — sample service' },
    { id: 'sample-tools', label: 'Tool borrowing — sample service' },
    { id: 'sample-operations-other', label: 'General lab support — sample service' },
  ],
} as const;
