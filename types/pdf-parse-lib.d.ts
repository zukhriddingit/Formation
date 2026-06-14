// pdf-parse's package entrypoint (index.js) contains debug code that reads a
// local sample PDF when `module.parent` is falsy, which throws under bundlers.
// We import the inner library file directly to avoid it; declare its types here.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PdfParseResult>;
  export default pdfParse;
}
