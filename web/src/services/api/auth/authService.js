import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "default_secret_key";

export const saveUserToStorage = (userData) => {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(userData),
    SECRET_KEY
  ).toString();
  if (typeof window !== 'undefined') localStorage.setItem("authUser", encryptedData);
};

export const getUserFromStorage = () => {
  if (typeof window === 'undefined') return null;
  const encryptedData = localStorage.getItem("authUser");
  if (!encryptedData) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (error) {
    return null;
  }
};

export const removeUserFromStorage = () => {
  if (typeof window !== 'undefined') localStorage.removeItem("authUser");
};
