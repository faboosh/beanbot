import e from "express";
import { encrypt, decryptIfEncrypted } from "../lib/crypto.js";

const wordsArray = [
  "cybernetic",
  "neon",
  "dystopia",
  "android",
  "replicant",
  "hacker",
  "matrix",
  "virtual",
  "augmentation",
  "synthetic",
];

const main = async () => {
  const encrypted = encrypt(wordsArray[0]);
  console.log(
    decryptIfEncrypted(encrypted) ==
      decryptIfEncrypted(decryptIfEncrypted(encrypted))
  );
  process.exit(0);
};

main();
