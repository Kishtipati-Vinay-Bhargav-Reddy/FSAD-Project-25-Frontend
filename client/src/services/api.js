import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", 
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const token = window.localStorage.getItem("token");
  const storedUser = window.localStorage.getItem("auth_user");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);

      if (user?.email) {
        config.headers["X-User-Email"] = user.email;
      }

      if (user?.role) {
        config.headers["X-User-Role"] = user.role;
      }
    } catch {
      // Ignore invalid stored user payloads and continue the request.
    }
  }

  return config;
});

export default api;
