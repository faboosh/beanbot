import { downloadById } from "../MusicPlayer/platforms/youtube";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { getPrimitive as c } from "./colorsystem";
import gm from "gm";
import fs from "fs";
import path from "path";
import axios from "axios";
import { randomUUID } from "crypto";

const TMP_DIR = path.join(__dirname, "../../../", "temp/");
const OUT_DIR = path.join(__dirname, "../../../", "images/");
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
  return Promise.all(
    tempPaths.map((tempPath) => {
      return new Promise((resolve, reject) => {
        fs.rm(tempPath, (err) => {
          if (err) reject(err);
          resolve(tempPath);
        });
      });
    })
  );
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

const generatePlayingCard = async (
  youtubeId: string,
  elapsedSeconds?: number,
  totalSeconds?: number
) => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR);
  const w = 800;
  const h = 200;
  const fontSize = 20;
  const padding = 20;
  const maxTitleLen = 40;

  return new Promise(async (resolve, reject) => {
    const thumbnailData = await downloadThumbnail(youtubeId);
    if (!thumbnailData || !thumbnailData.thumbnail)
      throw new Error("No thumbnail found");

    let title = thumbnailData.data.details.title;
    if (title.length > maxTitleLen)
      title = title.substring(0, maxTitleLen) + "...";
    const thumbnail = thumbnailData.thumbnail;
    const outPath = path.join(OUT_DIR, `${youtubeId}.png`);

    const blurredThumb = await toTemp(
      gm(thumbnail)
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

    const withTitle = await toTemp(
      gm(compositedThumbs)
        .font(SplineSans, fontSize)
        .fill(c("accent", 50))
        .drawText(rightColStart, padding + fontSize, title)
    );

    const playBarHeight = 10;
    gm(withTitle)
      .fill(c("accent", 50))
      .drawRectangle(
        rightColStart,
        h - padding - playBarHeight,
        rightColEnd,
        h - padding
      )
      // Add text
      .write(outPath, async (err) => {
        if (err) reject(err);
        console.log("Composite image created:", outPath);
        await cleanupTemp();
        resolve(outPath);
      });
  });
};

export { generatePlayingCard };
