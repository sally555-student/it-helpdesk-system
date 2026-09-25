import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../App.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <div className="login-left">

        <img
          src="/it help desk image.png"
          alt="IT Help Desk"
          className="hero-image"
        />

      </div>


      {/* RIGHT SIDE */}
      <div className="login-right">

        <div className="login-card">

          {/* Logo */}
          <div className="login-logo">
            <div className="logo-circle">
              🎧
            </div>

            <h1>IT Help Desk</h1>

            <p>Log in to your account</p>
          </div>


          {/* Error */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit}>

            {/* EMAIL */}
            <div className="login-field">

              <label htmlFor="email">
                Email <span>*</span>
              </label>

              <div className="input-box">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}
            <div className="login-field">

              <div className="password-title">

                <label htmlFor="password">
                  Password <span>*</span>
                </label>

              </div>

              <div className="input-box">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>

              </div>

            </div>


            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="blue-login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "➜  Log in"}
            </button>

          </form>


          {/* FORGOT PASSWORD */}
          <Link
            to="/forgot-password"
            className="forgot-link"
          >
            Forgot password?
          </Link>


          {/* DIVIDER */}
          <div className="login-divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>


          {/* REGISTER */}
          <div className="create-account">
            <span>Don't have an account?</span>

            <Link to="/register">
              Create one →
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}