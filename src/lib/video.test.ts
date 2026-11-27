import { describe, expect, it } from "vitest";
import { isVideoPathForCourse, videoPathFor } from "./video";

const course = "0b6f3a3e-6c2a-4a7b-9a51-3f8c2a1d9e10";

describe("course video paths", () => {
  it("builds a path inside the course folder", () => {
    expect(videoPathFor(course, "video/mp4", "abc12345")).toBe(`${course}/abc12345.mp4`);
    expect(videoPathFor(course, "video/quicktime", "abc12345")).toBe(`${course}/abc12345.mov`);
  });
  it("rejects other types and bad ids", () => {
    expect(videoPathFor(course, "image/png", "abc12345")).toBeNull();
    expect(videoPathFor("../x", "video/mp4", "abc12345")).toBeNull();
    expect(videoPathFor(course, "video/mp4", "A/B")).toBeNull();
  });
  it("accepts only this course's folder", () => {
    expect(isVideoPathForCourse(`${course}/abc12345.mp4`, course)).toBe(true);
    expect(isVideoPathForCourse(`11111111-1111-1111-1111-111111111111/abc12345.mp4`, course)).toBe(false);
    expect(isVideoPathForCourse(`${course}/../x.mp4`, course)).toBe(false);
    expect(isVideoPathForCourse(`${course}/abc12345.exe`, course)).toBe(false);
  });
});
