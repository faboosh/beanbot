const removers = [
    [
        "slowed + reverb",
        (str)=>str.replace(/[\(\[]]\s*slowed\s*([\+n]\s*)?reverb\s*[\)\]]/gim, "")
    ],
    [
        "official video/hd/hq",
        (str)=>str.replace(/[\(\[]\s*(officiell|official|full)?\s*((musi[ck]|lyrics?|hd|4k|720p)\s*)?(song|video|hd|hq|audio|version|visualizer|videoclip|remaster)?\s*[\)\]]/gim, "")
    ],
    [
        "live",
        (str)=>str.replace(/[\(\[]\s*live\s*[\)\]]/gim, "")
    ],
    [
        "audio",
        (str)=>str.replace(/[\(\[]\s*audio\s*[\)\]]/gim, "")
    ],
    [
        "music video",
        (str)=>str.replace(/(official\s)?music video/gim, "")
    ],
    [
        "napalm records",
        (str)=>str.replace(/napalm records/gim, "")
    ],
    [
        "resolution",
        (str)=>str.replace(/(hd|full\s*hd|720p|1080p|4k)/gim, "")
    ],
    [
        "hq",
        (str)=>str.replace(/[\(\[]\s*hq\s*[\)\]]/gim, "")
    ],
    [
        "nightcore",
        (str)=>str.replace(/[\(\[]\s*nightcore\s*[\)\]]/gim, "")
    ],
    [
        "cover art",
        (str)=>str.replace(/[\(\[]\s*cover\s*?art\s*[\)\]]/gim, "")
    ],
    [
        "lyrics",
        (str)=>str.replace(/[\(\[]\s*lyrics?\s*(video)?\s*[\)\]]/gim, "")
    ],
    [
        "special chars",
        (str)=>str.replace(RegExp("[^\\p{L}0-9 !-\\/\\\\:-@\\[\\]-`\\{\\}-~]", "gimu"), "")
    ],
    [
        "empty paranthesis",
        (str)=>str.replace(/[\(\[\{]\s*[\)\]\}]/gim, "")
    ]
];
const excluders = [
    [
        "Hour",
        (str)=>/[0-9]+\s*(\.[0-9]+)?(hours?|hr?)/gim.test(str)
    ],
    [
        "Mix",
        (str)=>/\s+mix/gim.test(str)
    ],
    [
        "Top List",
        (str)=>/top\s*[0-9]+/gim.test(str)
    ],
    [
        "Compilation",
        (str)=>/compilation/gim.test(str)
    ],
    [
        "Soundtrack",
        (str)=>/soundtrack/gim.test(str)
    ],
    [
        "Meme",
        (str)=>/meme/gim.test(str)
    ],
    [
        "Banned word",
        (str)=>[
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
                /crazyrussianhacker/gim
            ].some((regex)=>regex.test(str))
    ],
    [
        "Only Numbers",
        (str)=>!isNaN(Number(str))
    ]
];
const cleanTitle = (title)=>{
    if (shouldExcludeTitle(title)) return null;
    let cleanedTitle = title;
    for(let i = 0; i < removers.length; i++){
        const [name, remover] = removers[i];
        cleanedTitle = remover(cleanedTitle);
    }
    return cleanedTitle;
};
const shouldExcludeTitle = (title)=>{
    return excluders.some(([_name, test])=>{
        const match = test(title);
        return match;
    });
};
export { cleanTitle };
