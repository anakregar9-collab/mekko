/** Uploaded course videos: allowed types and the bucket's size limit (the project may enforce a lower limit). */
export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export function videoPathFor(courseId: string, mime: string, random: string): string | null {
  const ext = VIDEO_TYPES[mime];
  if (!ext || !/^[0-9a-f-]{36}$/.test(courseId) || !/^[a-z0-9]{8,40}$/.test(random)) return null;
  return `${courseId}/${random}.${ext}`;
}

/** A path is only accepted inside the course's own folder. */
export function isVideoPathForCourse(path: string, courseId: string): boolean {
  return (
    new RegExp(`^${courseId}/[a-z0-9]{8,40}\\.(mp4|webm|mov)$`).test(path) && /^[0-9a-f-]{36}$/.test(courseId)
  );
}
