/**
 * Extract plain text from an uploaded resume file (PDF / DOCX / TXT).
 * Runs server-side only (Node runtime). Packages are imported dynamically so the
 * client bundle never pulls them in and a missing/broken parser degrades to a
 * helpful error rather than a crash.
 */

const PDF_TYPES = ["application/pdf"];
const DOCX_TYPES = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export class FileExtractionError extends Error {}

export function isSupportedResumeFile(file: { name: string; type: string }): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    PDF_TYPES.includes(file.type) ||
    DOCX_TYPES.includes(file.type) ||
    file.type.startsWith("text/")
  );
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength === 0) {
    throw new FileExtractionError("The uploaded file was empty.");
  }

  try {
    if (name.endsWith(".pdf") || PDF_TYPES.includes(type)) {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const result = await pdfParse(buffer);
      return (result.text ?? "").trim();
    }

    if (name.endsWith(".docx") || DOCX_TYPES.includes(type)) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return (result.value ?? "").trim();
    }

    if (name.endsWith(".txt") || name.endsWith(".md") || type.startsWith("text/")) {
      return buffer.toString("utf-8").trim();
    }
  } catch (error) {
    throw new FileExtractionError(
      `Could not read "${file.name}". ${error instanceof Error ? error.message : "Unknown parser error."}`,
    );
  }

  throw new FileExtractionError(
    `Unsupported file type for "${file.name}". Upload a PDF, DOCX, or .txt — or paste your text instead.`,
  );
}
