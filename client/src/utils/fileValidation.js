export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx";
export const ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx"];

export const validateDocumentFile = (file) => {
  if (!file) {
    return null;
  }

  const fileName = file.name || "";
  const extension = fileName.includes(".")
    ? fileName.split(".").pop().toLowerCase()
    : "";

  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    return "Only PDF, DOC, and DOCX files are allowed.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "File size must be 10MB or smaller.";
  }

  return null;
};
