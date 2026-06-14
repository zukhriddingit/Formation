import { NextResponse } from "next/server";
import { extractProfile } from "@/lib/profile/extract";
import { extractTextFromFile, FileExtractionError, isSupportedResumeFile } from "@/lib/profile/file-text";

// pdf-parse / mammoth need the Node runtime (Buffer, fs).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

type ExtractInput = {
  text: string;
  linkedinUrl: string | null;
  fileNote: string | null;
};

/**
 * Read the request in either multipart (file + fields) or JSON form.
 * IMPORTANT: a LinkedIn URL is treated as a link only — we never fetch or scrape
 * the page. If LinkedIn/profile *text* is pasted, that text is what we parse.
 */
async function readInput(request: Request): Promise<ExtractInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const pasted = String(formData.get("text") ?? formData.get("profileText") ?? "").trim();
    const linkedinUrl = String(formData.get("linkedinUrl") ?? formData.get("linkedin_url") ?? "").trim() || null;
    const file = formData.get("file") ?? formData.get("resume");

    let fileText = "";
    let fileNote: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        fileNote = `"${file.name}" is larger than 8 MB — paste the relevant text instead.`;
      } else if (!isSupportedResumeFile(file)) {
        fileNote = `"${file.name}" isn't a supported type — upload a PDF, DOCX, or .txt.`;
      } else {
        try {
          fileText = await extractTextFromFile(file);
          if (!fileText) {
            fileNote = `Couldn't pull any text from "${file.name}" (it may be scanned/image-only). Paste your text instead.`;
          }
        } catch (error) {
          fileNote = error instanceof FileExtractionError ? error.message : `Couldn't read "${file.name}".`;
        }
      }
    }

    const text = [fileText, pasted].filter(Boolean).join("\n\n").trim();
    return { text, linkedinUrl, fileNote };
  }

  const payload = (await request.json().catch(() => ({}))) as {
    text?: string;
    profileText?: string;
    linkedinUrl?: string;
    linkedin_url?: string;
  };
  return {
    text: (payload.text ?? payload.profileText ?? "").trim(),
    linkedinUrl: (payload.linkedinUrl ?? payload.linkedin_url ?? "").trim() || null,
    fileNote: null,
  };
}

export async function POST(request: Request) {
  let input: ExtractInput;

  try {
    input = await readInput(request);
  } catch {
    return NextResponse.json(
      {
        error: "Could not read the upload. Paste your profile text and fill the card in manually.",
      },
      { status: 400 },
    );
  }

  // Nothing usable to parse, but still let the user proceed by hand.
  if (!input.text && !input.linkedinUrl) {
    return NextResponse.json(
      {
        name: null,
        email: null,
        headline: null,
        bio: null,
        skills: [],
        positions: [],
        interests: [],
        experience_level: null,
        linkedin_url: null,
        confidence: 0,
        notes: [
          input.fileNote ?? "No resume or text was provided.",
          "Fill the card in manually — every field is editable.",
        ].filter(Boolean),
        mode: "empty",
      },
      { status: 200 },
    );
  }

  const { extraction, mode } = await extractProfile({ text: input.text, linkedinUrl: input.linkedinUrl });

  // Surface any file-read note alongside the extraction notes.
  const notes = input.fileNote ? [input.fileNote, ...extraction.notes] : extraction.notes;

  // NOTE: raw resume text is never returned verbatim or persisted — only this draft.
  return NextResponse.json({ ...extraction, notes, mode }, { status: 200 });
}
