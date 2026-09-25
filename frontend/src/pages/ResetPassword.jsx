import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import * as authService from "../services/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const linkLooksValid = Boolean(token && email);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, email, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "This reset link is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  }


if (!linkLooksValid) {
    return (
        <div className="auth-page">

            <img
                src="/YOUR-IMAGE-PATH.png"
                alt="Illustration"
                className="auth-hero-image"
            />

            <div className="auth-form">

                <h1>Invalid link</h1>

                <p className="subtitle">
                    This password reset link is missing information.
                    Request a new one below.
                </p>

                <p className="switch-link">
                    <Link to="/forgot-password">
                        Request a new reset link
                    </Link>
                </p>

            </div>
        </div>
    );
}




return (
    <div className="auth-page">

        <img
            src="/it help desk image.png"
            alt="Illustration"
            className="auth-hero-image"
        />

        <form className="auth-form" onSubmit={handleSubmit}>

            <h1>Reset your password</h1>

            <p className="subtitle">
                Choose a new password for {email}
            </p>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {success && (
                <div className="success-banner">
                    Password updated — redirecting to login...
                </div>
            )}

            <label htmlFor="newPassword">
                New password
                <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
            />

            <label htmlFor="confirmPassword">
                Confirm new password
                <span style={{ color: "red" }}>*</span>
            </label>

            <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
            />

            <button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
            </button>

            <p className="switch-link">
                <Link to="/login">
                    Back to login
                </Link>
            </p>

        </form>
    </div>
)}