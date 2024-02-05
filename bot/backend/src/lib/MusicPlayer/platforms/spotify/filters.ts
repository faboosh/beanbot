const removers: [string, (str: string) => string][] = [
  [
    "slowed + reverb",
    (str: string) =>
      str.replace(/[\(\[]]\s*slowed\s*([\+n]\s*)?reverb\s*[\)\]]/gim, ""),
  ],
  [
    "official video/hd/hq",
    (str: string) =>
      str.replace(
        /[\(\[]\s*(officiell|official|full)?\s*((musi[ck]|lyrics?|hd|4k|720p)\s*)?(song|video|hd|hq|audio|version|visualizer|videoclip|remaster)?\s*[\)\]]/gim,
        ""
      ),
  ],
  ["live", (str: string) => str.replace(/[\(\[]\s*live\s*[\)\]]/gim, "")],
  ["audio", (str: string) => str.replace(/[\(\[]\s*audio\s*[\)\]]/gim, "")],
  [
    "music video",
    (str: string) => str.replace(/(official\s)?music video/gim, ""),
  ],
  ["napalm records", (str: string) => str.replace(/napalm records/gim, "")],
  [
    "resolution",
    (str: string) => str.replace(/(hd|full\s*hd|720p|1080p|4k)/gim, ""),
  ],
  ["hq", (str: string) => str.replace(/[\(\[]\s*hq\s*[\)\]]/gim, "")],
  [
    "nightcore",
    (str: string) => str.replace(/[\(\[]\s*nightcore\s*[\)\]]/gim, ""),
  ],
  [
    "cover art",
    (str: string) => str.replace(/[\(\[]\s*cover\s*?art\s*[\)\]]/gim, ""),
  ],
  [
    "lyrics",
    (str: string) => str.replace(/[\(\[]\s*lyrics?\s*(video)?\s*[\)\]]/gim, ""),
  ],
  [
    "special chars",
    (str: string) => str.replace(/[^\p{L}0-9 !-\/\\:-@\[\]-`\{\}-~]/gimu, ""),
  ],
  [
    "empty paranthesis",
    (str: string) => str.replace(/[\(\[\{]\s*[\)\]\}]/gim, ""),
  ],
];

const excluders: [string, (str: string) => boolean][] = [
  ["Hour", (str: string) => /[0-9]+\s*(\.[0-9]+)?(hours?|hr?)/gim.test(str)],
  ["Mix", (str: string) => /\s+mix/gim.test(str)],
  ["Top List", (str: string) => /top\s*[0-9]+/gim.test(str)],
  ["Compilation", (str: string) => /compilation/gim.test(str)],
  ["Soundtrack", (str: string) => /soundtrack/gim.test(str)],
  ["Meme", (str: string) => /meme/gim.test(str)],
  [
    "Banned word",
    (str: string) =>
      [
        /Rucka Rucka Ali/gim,
        /penis/gim,
        /vagina/gim,
        /tik([\s-])?tok/gim,
        /xqc/gim,
        /Movie CLIP/gim,
        /DPRK/gim,
        /North Korea/gim,
        /rapist/gim,
        /ussr/gim,
        /mashup/gim,
        /Kids? Songs?/gim,
        /Adult Swim/gim,
        /crazyrussianhacker/gim,
      ].some((regex) => regex.test(str)),
  ],
  ["Only Numbers", (str: string) => !isNaN(Number(str))],
];

const cleanTitle = (title: string) => {
  if (shouldExcludeTitle(title)) return null;

  let cleanedTitle = title;
  for (let i = 0; i < removers.length; i++) {
    const [name, remover] = removers[i];
    cleanedTitle = remover(cleanedTitle);
  }

  return cleanedTitle;
};

const shouldExcludeTitle = (title: string) => {
  return excluders.some(([_name, test]) => {
    const match = test(title);
    return match;
  });
};

export { cleanTitle };
