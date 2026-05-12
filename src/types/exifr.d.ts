declare module "exifr" {
  export function parse(
    input: File | ArrayBuffer | Uint8Array | Buffer | string,
    options?: string[] | Record<string, boolean>
  ): Promise<Record<string, unknown> | undefined>;
}
