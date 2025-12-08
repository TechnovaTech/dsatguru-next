export const getAuthToken = () => {
    return localStorage.getItem("authToken");
};

export const getUserData = () => {
    return JSON.parse(localStorage.getItem("userData"));
};