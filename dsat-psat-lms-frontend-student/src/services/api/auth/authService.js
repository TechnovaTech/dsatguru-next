import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || "default_secret_key";

// Encrypt and Save user to localStorage
export const saveUserToStorage = (userData) => {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(userData),
    SECRET_KEY
  ).toString();
  localStorage.setItem("authUser", encryptedData);
};

// Get Decrypted User
export const getUserFromStorage = () => {
  const encryptedData = localStorage.getItem("authUser");
  if (!encryptedData) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (error) {
    console.error("Failed to decrypt user data:", error);
    return null;
  }
};

// Remove User
export const removeUserFromStorage = () => {
  localStorage.removeItem("authUser");
};
