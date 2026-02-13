export type OtaBundlePayload = {
  id: string;
  url: string;
  checksumSha256: string;
  sizeBytes: number;
};

export interface UpdateRuntimeAdapter {
  isAvailable(): Promise<boolean>;
  getCurrentBundleVersion(defaultVersion: string): Promise<string>;
  downloadAndApply(bundle: OtaBundlePayload): Promise<void>;
}
