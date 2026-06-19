import { createContext, useContext, useEffect, useState } from "react";
import api, { setToken, clearToken, getToken } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // undefined=loading, null=guest

  useEffect(() => {
    if (!getToken()) {
      setUser((prev) => (prev === undefined ? null : prev));
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser((prev) => (prev === undefined ? res.data : prev)))
      .catch(() => { clearToken(); setUser((prev) => (prev === undefined ? null : prev)); });
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
