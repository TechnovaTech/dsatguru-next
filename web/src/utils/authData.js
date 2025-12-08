export const getAuthToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem("authToken");
};

export const getUserData = () => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem("userData")); } catch { return null }
};
