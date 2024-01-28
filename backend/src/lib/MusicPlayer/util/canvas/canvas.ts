import gm from "gm";
import fs from "fs";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import axios from "axios";
import { randomUUID } from "crypto";
import { downloadById, getThumbnail } from "../../platforms/youtube.js";
import { getPrimitive as c } from "../../../colorsystem.js";
import { getTitleAuthor } from "../metadata.js";
import { secondsToTimestamp } from "../../../util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, "../../../../../", "temp/");
const OUT_DIR = path.join(__dirname, "../../../../../", "images/");

console.log("Image dirs: ", { TMP_DIR, OUT_DIR });
const SplineSans = "./assets/SplineSansMono-Medium.ttf";

async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    // Axios GET request to fetch the image as a stream
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
    });

    // Extracting the file name from the URL
    const parsedUrl = new URL(imageUrl);
    const basename = path.basename(parsedUrl.pathname);

    // Creating a write stream to save the file
    const filePath = path.join(TMP_DIR, basename);
    const writer = createWriteStream(filePath);

    response.data.pipe(writer);

    const output = await new Promise<string>((resolve, reject) => {
      writer.on("finish", () => resolve(filePath));
      writer.on("error", reject);
    });

    if (output === null) throw new Error("Could not write image");

    return output;
  } catch (error) {
    console.error("Error downloading the image:", error);
    return null;
  }
}

const downloadThumbnail = async (youtubeId: string) => {
  try {
    const data = await downloadById(youtubeId);
    const thumbnail = data?.details.thumbnail?.[0]?.url;
    if (!thumbnail) throw new Error("No thumbnail found");
    const downloadedThumbnail = await downloadImage(thumbnail);
    if (downloadThumbnail === null)
      throw new Error("Failed to download thumbnail");
    return {
      data: data,
      thumbnail: downloadedThumbnail,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};

const text = (
  instance: gm.State,
  str: string,
  options: { x: number; y: number; size: number; color: string }
) => {
  instance.font(SplineSans);
  instance.fill(options.color);
  instance.fontSize(options.size);
  instance.drawText(options.x, options.y + options.size / 2, str);
  return instance;
};

const tempPaths: string[] = [];

const cleanupTemp = () => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
};

const borderRadius = (
  imagePath: string,
  cornerRadius: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    gm(imagePath).size(async (err, size) => {
      if (err) {
        reject(err);
      } else {
        // Create a rounded rectangle mask
        const mask = await toTemp(
          gm(size.width, size.height, "none")
            .fill("#ffffff")
            .drawRectangle(
              0,
              0,
              size.width,
              size.height,
              cornerRadius,
              cornerRadius
            )
        );

        // Apply the mask to the original image
        toTemp(gm(imagePath).mask(mask)).then(resolve).catch(reject);
      }
    });
  });
};

const toTemp = (instance: gm.State): Promise<string> => {
  const outPath = path.join(TMP_DIR, `${randomUUID()}.png`);
  return new Promise((resolve, reject) => {
    instance.write(outPath, (err) => {
      if (err) {
        console.error("Error:", err);
        reject(err);
      } else {
        tempPaths.push(outPath);
        resolve(outPath);
      }
    });
  });
};

const generatePlayingCard = (
  youtubeId: string,
  elapsedSeconds: number = 60,
  totalSeconds: number = 350
): Promise<string> => {
  console.time("Generate image");
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR);
  const w = 1000;
  const h = 200;
  const fontSize = 32;
  const smFontSize = 24;
  const padding = 20;
  const maxTitleLen = 30;

  return new Promise(async (resolve, reject) => {
    const thumbnailUrl = await getThumbnail(youtubeId);
    if (!thumbnailUrl) throw new Error("No thumbnail found");

    let { title, author } = await getTitleAuthor(youtubeId);
    if (title.length > maxTitleLen)
      title = title.substring(0, maxTitleLen) + "...";
    const outPath = path.join(OUT_DIR, `${youtubeId}.png`);
    const thumbnailData = await downloadThumbnail(youtubeId);
    if (!thumbnailData?.thumbnail) return;
    const { thumbnail } = thumbnailData;
    const blurredThumb = await toTemp(
      gm(thumbnail)
        .modulate(70, 70)
        .resize(w, h, "^") // Resize & crop to maintain aspect ratio
        .gravity("Center")
        .extent(w, h) // Ensure the image is exactly 800x200
        .blur(50, 25)
    );

    const smallH = h - padding * 2;
    const smallW = Math.round((smallH / 9) * 16);
    const roundedThumb = await borderRadius(thumbnail, 20);

    const smallThumb = await toTemp(
      gm(roundedThumb).resize(smallW, smallH, "^") // Resize & crop to maintain aspect ratio
    );

    const compositedThumbs = await toTemp(
      gm(blurredThumb).composite(smallThumb).geometry(`+${padding}+${padding}`)
    );

    const rightColStart = smallW + padding * 2;
    const rightColEnd = w - padding;
    const rightColW = rightColEnd - rightColStart - padding;
    const elapsedNormalized = elapsedSeconds / totalSeconds;
    const playBarHeight = 10;
    const playbarTimestampPadding = Math.round(padding / 2);
    const playbarX1 = rightColStart;
    const playbarY1 =
      h - padding - playBarHeight - smFontSize - playbarTimestampPadding;
    const playbarX2 = rightColEnd;
    const playbarY2 = h - padding - smFontSize - playbarTimestampPadding;

    const withTitle = await toTemp(
      gm(compositedThumbs)
        .font(SplineSans, fontSize)
        .fill(c("gray", 50))
        .drawText(rightColStart, padding + fontSize, title)
        .fontSize(smFontSize)
        .drawText(
          rightColStart,
          Math.round(padding + fontSize * 2 + fontSize * 0.1),
          author
        )
        .drawText(
          rightColEnd - 150,
          playbarY2 + smFontSize + playbarTimestampPadding,
          `${secondsToTimestamp(elapsedSeconds)}/${secondsToTimestamp(
            totalSeconds
          )}`
        )
    );

    gm(withTitle)
      .fill(c("gray", 300))
      .drawRectangle(playbarX1, playbarY1, playbarX2, playbarY2)
      .fill(c("gray", 50))
      .drawRectangle(
        playbarX1,
        playbarY1,
        playbarX1 + elapsedNormalized * rightColW,
        playbarY2
      )
      // Add text
      .write(outPath, async (err) => {
        await cleanupTemp();
        if (err) reject(err);
        // console.log("Composite image created:", outPath);
        console.timeEnd("Generate image");

        resolve(outPath);
      });
  });
};

export { generatePlayingCard };