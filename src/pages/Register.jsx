import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { registerUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Check password requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const hasMinLength = password.length >= 8;

    if (!hasMinLength) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!hasUppercase) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

  
    if (!hasLowercase) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!hasNumber) {
      setError("Password must contain at least one number.");
      return;
    }

    if (!hasSymbol) {
      setError("Password must contain at least one symbol.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(fullName, email, password, department);

      setSuccess(true);

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }


return (
    <div className="auth-page">

        <img
            src="/it help desk image.png"
            alt="Illustration"
            className="auth-hero-image"
        />

        <form className="auth-form" onSubmit={handleSubmit}>

            <h1>Create an account</h1>

            <p className="subtitle">
                Sign up as an employee
            </p>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {success && (
                <div className="success-banner">
                    Account created — redirecting to login...
                </div>
            )}

            <label htmlFor="fullName">
                Full name <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
            />

            <label htmlFor="email">
                Email <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <label htmlFor="password">
                Password <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
            />

            <label htmlFor="department">
                Department <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
            />

            <button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
            </button>

            <p className="switch-link">
                Already have an account?{" "}
                <Link to="/login">
                    Log in
                </Link>
            </p>
      </form>
    </div>
  );
}
