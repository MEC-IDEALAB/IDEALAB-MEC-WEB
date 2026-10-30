// Owner-approved intake categories, 22 October 2026. Not live availability/stock.
export const requestServices = {
  machine: [
    { id: 'laser-cutting', label: 'Laser cutting' },
    { id: '3d-printing', label: '3D printing' },
    { id: 'cnc', label: 'CNC work' },
    { id: 'cup-printing', label: 'Cup printing' },
    { id: 't-shirt-printing', label: 'T-shirt printing' },
    { id: '3d-design', label: '3D design' },
    { id: 'laser-design', label: 'Laser design' },
    { id: 'lathe', label: 'Lathe work' },
    { id: 'woodwork', label: 'Woodwork' },
  ],
  operations: [
    { id: 'components', label: 'Components' },
    { id: 'ics', label: 'ICs' },
    { id: 'electronics-tools', label: 'Electronics tools' },
    { id: 'hardware', label: 'Hardware' },
  ],
} as const;
export function isRequestService(kind: 'machine' | 'operations', id: string): boolean {
  return requestServices[kind].some(service => service.id === id);
}
