/** Content-Disposition for a downloaded file named after the resume: a safe ASCII name plus an RFC 5987 UTF-8 one. */
export function attachmentHeader(name: string, ext: "pdf" | "docx" | "json"): string {
  const base = name.trim() || "resume";
  const ascii = base.replace(/[^\w.\- ]+/g, "_");
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(base)}.${ext}`;
}
