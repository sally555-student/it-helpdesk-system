import { useState } from "react";
import { Link } from "react-router-dom";
import * as authService from "../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await authService.forgotPassword(email);
      // The API always returns the same generic message whether or not the
      // email is registered — that's intentional, don't try to detect otherwise.
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
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

            <h1>Forgot password</h1>

            <p className="subtitle">
                We'll email you a link to reset it
            </p>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {message && (
                <div className="success-banner">
                    {message}
                </div>
            )}

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

            <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="switch-link">
                Remembered it?{" "}
                <Link to="/login">
                    Back to login
                </Link>
            </p>

        </form>
    </div>
)}
