/**
 * User-facing error messages for actions. Keeps copy consistent and easy to change.
 */

export const ERROR_MESSAGES = {
  chat: {
    generic: "Failed to get a response. Please try again.",
    emptyMessage: "Message cannot be empty",
    messageTooLong: "Message too long",
  },
  upload: {
    noFile: "No file provided.",
    fileTooLarge: (maxMb: number) => `File too large. Max ${maxMb} MB.`,
    unsupportedType: "Only PDF and TXT files are supported.",
    noText: "File contains no extractable text.",
    noChunks: "No text chunks could be created.",
  },
} as const;
