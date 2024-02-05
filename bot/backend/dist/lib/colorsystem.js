const colorsystem = {
    primitives: {
        gray: {
            50: {
                $type: "color",
                $value: "#eafdfb"
            },
            100: {
                $type: "color",
                $value: "#cad9d7"
            },
            200: {
                $type: "color",
                $value: "#acb6b5"
            },
            300: {
                $type: "color",
                $value: "#8e9494"
            },
            400: {
                $type: "color",
                $value: "#717474"
            },
            500: {
                $type: "color",
                $value: "#555555"
            },
            600: {
                $type: "color",
                $value: "#383c3c"
            },
            700: {
                $type: "color",
                $value: "#1e2424"
            },
            800: {
                $type: "color",
                $value: "#060f0e"
            },
            900: {
                $type: "color",
                $value: "#000101"
            }
        },
        brand: {
            50: {
                $type: "color",
                $value: "#a8ffff"
            },
            100: {
                $type: "color",
                $value: "#85f9ef"
            },
            200: {
                $type: "color",
                $value: "#5ee1d6"
            },
            300: {
                $type: "color",
                $value: "#2cc9be"
            },
            400: {
                $type: "color",
                $value: "#00b1a7"
            },
            500: {
                $type: "color",
                $value: "#009990"
            },
            600: {
                $type: "color",
                $value: "#00726a"
            },
            700: {
                $type: "color",
                $value: "#004d47"
            },
            800: {
                $type: "color",
                $value: "#002b27"
            },
            900: {
                $type: "color",
                $value: "#000c0a"
            }
        },
        accent: {
            50: {
                $type: "color",
                $value: "#ffeeff"
            },
            100: {
                $type: "color",
                $value: "#ead3ff"
            },
            200: {
                $type: "color",
                $value: "#d1b9ff"
            },
            300: {
                $type: "color",
                $value: "#b99ef4"
            },
            400: {
                $type: "color",
                $value: "#a185de"
            },
            500: {
                $type: "color",
                $value: "#8a6cc8"
            },
            600: {
                $type: "color",
                $value: "#664c99"
            },
            700: {
                $type: "color",
                $value: "#442e6c"
            },
            800: {
                $type: "color",
                $value: "#251242"
            },
            900: {
                $type: "color",
                $value: "#0a001c"
            }
        },
        success: {
            50: {
                $type: "color",
                $value: "#c3ffe1"
            },
            100: {
                $type: "color",
                $value: "#a4f8c6"
            },
            200: {
                $type: "color",
                $value: "#85dfab"
            },
            300: {
                $type: "color",
                $value: "#65c790"
            },
            400: {
                $type: "color",
                $value: "#43af77"
            },
            500: {
                $type: "color",
                $value: "#10985e"
            },
            600: {
                $type: "color",
                $value: "#007141"
            },
            700: {
                $type: "color",
                $value: "#004c26"
            },
            800: {
                $type: "color",
                $value: "#002a0c"
            },
            900: {
                $type: "color",
                $value: "#000c00"
            }
        },
        warning: {
            50: {
                $type: "color",
                $value: "#fff4ae"
            },
            100: {
                $type: "color",
                $value: "#ffd98e"
            },
            200: {
                $type: "color",
                $value: "#f2bf6e"
            },
            300: {
                $type: "color",
                $value: "#dba54c"
            },
            400: {
                $type: "color",
                $value: "#c48c23"
            },
            500: {
                $type: "color",
                $value: "#ad7300"
            },
            600: {
                $type: "color",
                $value: "#825200"
            },
            700: {
                $type: "color",
                $value: "#5a3300"
            },
            800: {
                $type: "color",
                $value: "#351700"
            },
            900: {
                $type: "color",
                $value: "#130100"
            }
        },
        danger: {
            50: {
                $type: "color",
                $value: "#ffe1e3"
            },
            100: {
                $type: "color",
                $value: "#ffc5c7"
            },
            200: {
                $type: "color",
                $value: "#ffa9ad"
            },
            300: {
                $type: "color",
                $value: "#f48e93"
            },
            400: {
                $type: "color",
                $value: "#dc7379"
            },
            500: {
                $type: "color",
                $value: "#c55961"
            },
            600: {
                $type: "color",
                $value: "#963b43"
            },
            700: {
                $type: "color",
                $value: "#692028"
            },
            800: {
                $type: "color",
                $value: "#3f050f"
            },
            900: {
                $type: "color",
                $value: "#190000"
            }
        }
    },
    tokens: {
        "surface-canvas": {
            $type: "color",
            $value: "primitives.gray.50"
        },
        "surface-primary": {
            $type: "color",
            $value: "primitives.persistent.white"
        },
        "surface-secondary": {
            $type: "color",
            $value: "primitives.gray.50"
        },
        "surface-tertiary": {
            $type: "color",
            $value: "primitives.gray.100"
        },
        "surface-inverted": {
            $type: "color",
            $value: "primitives.gray.900"
        },
        "surface-brand": {
            $type: "color",
            $value: "primitives.brand.600"
        },
        "surface-accent": {
            $type: "color",
            $value: "primitives.accent.600"
        },
        "text-primary": {
            $type: "color",
            $value: "primitives.gray.900"
        },
        "text-secondary": {
            $type: "color",
            $value: "primitives.gray.700"
        },
        "text-tertiary": {
            $type: "color",
            $value: "primitives.gray.600"
        },
        "text-quarternary": {
            $type: "color",
            $value: "primitives.gray.500"
        },
        "text-inverted": {
            $type: "color",
            $value: "primitives.persistent.white"
        },
        "text-brand": {
            $type: "color",
            $value: "primitives.brand.600"
        },
        "text-link": {
            $type: "color",
            $value: "primitives.brand.600"
        },
        "text-on-inverted-primary": {
            $type: "color",
            $value: "primitives.persistent.white"
        },
        "text-on-inverted-secondary": {
            $type: "color",
            $value: "primitives.gray.200"
        },
        "text-on-brand-primary": {
            $type: "color",
            $value: "primitives.persistent.white"
        },
        "text-on-brand-secondary": {
            $type: "color",
            $value: "primitives.accent.100"
        },
        "text-on-accent-primary": {
            $type: "color",
            $value: "primitives.persistent.white"
        },
        "text-on-accent-secondary": {
            $type: "color",
            $value: "primitives.accent.100"
        },
        "divider-primary": {
            $type: "color",
            $value: "primitives.gray.500"
        },
        "divider-on-inverted": {
            $type: "color",
            $value: "primitives.gray.500"
        },
        "divider-on-brand": {
            $type: "color",
            $value: "primitives.brand.200"
        },
        "divider-on-accent": {
            $type: "color",
            $value: "primitives.accent.200"
        }
    }
};
const getPrimitive = (color, bright)=>{
    return colorsystem.primitives[color][bright].$value;
};
export { getPrimitive };
