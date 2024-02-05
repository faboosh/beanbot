import "dotenv-esm/config";
import CryptoJS from "crypto-js";
const IVString = process.env.ENCRYPTION_IV;
if (!IVString) throw new Error("No encryption_iv provided");
const fixedIV = CryptoJS.enc.Hex.parse(IVString);
const getKey = ()=>{
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) throw new Error("Encryption key not found");
    return CryptoJS.enc.Hex.parse(keyString); // or use another appropriate encoding
};
const encrypt = (str)=>{
    const key = getKey();
    return CryptoJS.AES.encrypt(str, key, {
        iv: fixedIV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).toString();
};
const decrypt = (encryptedStr)=>{
    const key = getKey();
    const bytes = CryptoJS.AES.decrypt(encryptedStr, key, {
        iv: fixedIV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return bytes.toString(CryptoJS.enc.Utf8);
};
const decryptIfEncrypted = (str)=>{
    return isEncrypted(str) ? decrypt(str) : str;
};
const isEncrypted = (str)=>{
    return str.length > 0 && decrypt(str).length !== 0;
};
export { encrypt, decrypt, isEncrypted, decryptIfEncrypted };
