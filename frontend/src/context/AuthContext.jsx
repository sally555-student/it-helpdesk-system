import { createContext, useContext, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {

    const stored = localStorage.getItem("user");

    return stored
      ? JSON.parse(stored)
      : null;
  });


  async function loginUser(email, password) {

    const data = await authService.login(
      email,
      password
    );

    localStorage.setItem(
      "token",
      data.token
    );


    const userData = {
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department,
    };


    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );


    setUser(userData);

    return data;
  }


  async function registerUser(
    fullName,
    email,
    password,
    department
  ) {

    return authService.register(
      fullName,
      email,
      password,
      department
    );
  }


  function updateUser(updatedUser) {

    setUser(updatedUser);

    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );
  }


  function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    setUser(null);
  }


  return (

    <AuthContext.Provider
      value={{
        user,
        loginUser,
        registerUser,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>

  );
}


export function useAuth() {
  return useContext(AuthContext);
}