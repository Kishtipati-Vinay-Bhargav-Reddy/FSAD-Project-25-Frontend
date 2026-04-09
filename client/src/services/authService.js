import api from "./api";


export const loginUser = async ({ email, password }) => {
  try {
    const { data } = await api.post("/api/auth/login", {
      email,
      password,
    });
    return data;
  } catch (error) {
    console.error("LOGIN ERROR:", error.response?.data || error.message);
    throw error;
  }
};


export const registerUser = async (user) => {
  try {
    const { data } = await api.post("/api/auth/register", user);
    return data;
  } catch (error) {
    console.error("REGISTER ERROR:", error.response?.data || error.message);
    throw error;
  }
};


export const fetchProfile = async (email) => {
  try {
    const response = await api.get("/api/auth/profile", {
      params: {
        ...(email && { email }),
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
