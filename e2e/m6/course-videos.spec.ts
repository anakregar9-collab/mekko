import { expect, test } from "@playwright/test";
import { checkPage, signUp, uid } from "../helpers";

// Bytes are not decoded by the test; storage only checks the declared type and size.
const FAKE_MP4 = Buffer.from("00000018667479706d703432000000006d70343269736f6d", "hex");

test("courses: uploaded videos are private, YouTube shows a warning, courses appear in Odkrivanje", async ({
  browser,
}) => {
  const org = await (await browser.newContext()).newPage();
  const learner = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  await signUp(org, "Videoustvarjalka Maja");
  await signUp(learner, "Učenec Jure");

  await org.goto(`/organizator/nov-prostor?vrsta=solo_creator&ime=${encodeURIComponent(`Video ${uid("")}`)}`);
  const slug = await org.getByLabel("Spletni naslov").inputValue();
  await org.getByRole("button", { name: "Ustvari prostor" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}$`));
  await org.goto(`/organizator/${slug}/tecaji`);
  const title = `Lončarski tečaj ${uid("")}`;
  await org.getByTestId("course-form").getByLabel("Naslov tečaja").fill(title);
  await org.getByTestId("course-form").getByRole("button", { name: "Ustvari tečaj" }).click();
  await expect(org).toHaveURL(new RegExp(`/organizator/${slug}/tecaji/[0-9a-f-]{36}$`));

  const form = org.getByTestId("lesson-form");
  // YouTube is the default and shows the warning
  await expect(form.getByTestId("youtube-warning")).toContainText(
    "lahko YouTube povezavo kopira in deli naprej",
  );

  // Uploaded preview lesson
  await form.getByLabel("Naslov lekcije").fill("Predogled: priprava gline");
  await form.getByLabel(/Naloži video v Mekko/).check();
  await expect(form.getByTestId("youtube-warning")).toHaveCount(0);
  await form.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(form.getByText("Najprej naloži video")).toBeVisible();
  await form.getByLabel(/Naloži video v Mekko/).check();
  await form
    .getByLabel(/Video datoteka/)
    .setInputFiles({ name: "glina.mp4", mimeType: "video/mp4", buffer: FAKE_MP4 });
  await expect(form.getByTestId("video-upload-status")).toContainText("Video je naložen");
  await form.getByLabel("Brezplačen predogled").check();
  await form.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(org.getByTestId("lesson-list")).toContainText("Naložen video");

  // Uploaded locked lesson
  await form.getByLabel("Naslov lekcije").fill("Vrtenje na kolesu");
  await form.getByLabel(/Naloži video v Mekko/).check();
  await form
    .getByLabel(/Video datoteka/)
    .setInputFiles({ name: "kolo.mp4", mimeType: "video/mp4", buffer: FAKE_MP4 });
  await expect(form.getByTestId("video-upload-status")).toContainText("Video je naložen");
  await form.getByRole("button", { name: "Dodaj lekcijo" }).click();
  await expect(org.getByTestId("lesson-list").locator("li")).toHaveCount(2);
  await org.getByRole("button", { name: "Objavi tečaj" }).click();
  await expect(org.getByText("Tečaj je objavljen.")).toBeVisible();
  await checkPage(org);

  // Guest finds it in Odkrivanje → Tečaji, sees the preview video (signed link), the other lesson is locked
  await guest.goto(`/odkrivanje?pogled=tecaji&q=${encodeURIComponent(title)}`);
  await expect(guest.getByTestId("tab-tecaji")).toHaveAttribute("aria-current", "page");
  await checkPage(guest);
  await guest
    .getByTestId("courses-feed")
    .getByRole("link", { name: new RegExp(title) })
    .click();
  await expect(guest.getByTestId("uploaded-video")).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/course-videos\//,
  );
  await expect(guest.getByTestId("course-outline").getByRole("link")).toHaveCount(1);
  const courseUrl = guest.url().split("?")[0];

  // Learner starts the free course and can watch the second lesson
  await learner.goto(courseUrl);
  await learner.getByRole("button", { name: "Začni brezplačno" }).click();
  await expect(learner.getByTestId("course-access")).toContainText("Tečaj je tvoj");
  await learner
    .getByTestId("course-outline")
    .getByRole("link", { name: /Vrtenje na kolesu/ })
    .click();
  await expect(learner.getByTestId("uploaded-video")).toHaveAttribute("src", /course-videos\/.+token=/);
});
