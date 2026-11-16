import {
  Geist,
  Newsreader,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";

/** Newsreader for reading, Geist for the interface. Indian-script faces load only when used. */
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], display: "swap", variable: "--nf-newsreader" });
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--nf-geist" });

const deva = Noto_Sans_Devanagari({ weight: ["400", "600"], subsets: ["devanagari"], display: "swap", preload: false, variable: "--nf-deva" });
const taml = Noto_Sans_Tamil({ weight: ["400", "600"], subsets: ["tamil"], display: "swap", preload: false, variable: "--nf-taml" });
const knda = Noto_Sans_Kannada({ weight: ["400", "600"], subsets: ["kannada"], display: "swap", preload: false, variable: "--nf-knda" });
const telu = Noto_Sans_Telugu({ weight: ["400", "600"], subsets: ["telugu"], display: "swap", preload: false, variable: "--nf-telu" });
const mlym = Noto_Sans_Malayalam({ weight: ["400", "600"], subsets: ["malayalam"], display: "swap", preload: false, variable: "--nf-mlym" });
const beng = Noto_Sans_Bengali({ weight: ["400", "600"], subsets: ["bengali"], display: "swap", preload: false, variable: "--nf-beng" });

export const fontVariables = [newsreader, geist, deva, taml, knda, telu, mlym, beng].map((f) => f.variable).join(" ");
