export interface DriftDetail {
  id: number;
  environmentName: string;
  resourceName: string;
  driftType: string;
  detectedAt: string;
  isResolved: boolean;
}

export const DRIFT_TYPES = [
  { value: 'ConfigDrift', label: 'Config Drift' },
  { value: 'ResourceDrift', label: 'Resource Drift' },
  { value: 'VersionDrift', label: 'Version Drift' },
  { value: 'ScaleDrift', label: 'Scale Drift' },
  { value: 'NetworkDrift', label: 'Network Drift' },
  { value: 'SecurityDrift', label: 'Security Drift' }
];

export function getDriftTypeClass(driftType: string): string {
  const map: Record<string, string> = {
    ConfigDrift: 'config',
    ResourceDrift: 'resource',
    VersionDrift: 'version',
    ScaleDrift: 'scale'
  };
  return map[driftType] ?? 'other';
}
