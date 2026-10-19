import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  signUpUser,
  confirmUserSignUp,
  resendConfirmationCode,
} from "../services/auth";

export default function SignUpConsole() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Sign up, 2: Confirm code, 3: Success
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && passwordsMatch;

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isPasswordValid) {
      setError("Please satisfy all password security requirements before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await signUpUser(email, password);
      if (res.userConfirmed) {
        setStep(3);
      } else {
        setStep(2);
        setMessage(`Confirmation code sent to ${email}. Check your inbox.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!code.trim()) {
      setError("Please enter the 6-digit confirmation code.");
      return;
    }

    setLoading(true);
    try {
      await confirmUserSignUp(email, code);
      setStep(3);
      setMessage("Email confirmed successfully! Your Cognito account is active.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      await resendConfirmationCode(email);
      setMessage("A fresh verification code was sent to your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-console">
      <div className="eyebrow">AMAZON COGNITO REGISTRATION</div>

      {step === 1 && (
        <>
          <h1>Create Engineering Account</h1>
          <p className="muted">
            Set up self-service access to WaferIQ and subscribe to automated
            semiconductor yield excursion notifications via Amazon SNS.
          </p>

          <form onSubmit={handleSignUp} className="signup-form">
            <div className="form-field">
              <label>Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                required
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
                required
              />
            </div>

            <div className="form-field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

            {/* Password Policy Checklist */}
            <div className="password-policy-box">
              <span className="policy-title">Cognito Password Requirements:</span>
              <div className="policy-checklist">
                <span className={`policy-item ${hasMinLength ? "valid" : ""}`}>
                  {hasMinLength ? "✓" : "○"} At least 8 characters
                </span>
                <span className={`policy-item ${hasUpper ? "valid" : ""}`}>
                  {hasUpper ? "✓" : "○"} Uppercase letter (A-Z)
                </span>
                <span className={`policy-item ${hasLower ? "valid" : ""}`}>
                  {hasLower ? "✓" : "○"} Lowercase letter (a-z)
                </span>
                <span className={`policy-item ${hasNumber ? "valid" : ""}`}>
                  {hasNumber ? "✓" : "○"} Number (0-9)
                </span>
                <span className={`policy-item ${passwordsMatch ? "valid" : ""}`}>
                  {passwordsMatch ? "✓" : "○"} Passwords match
                </span>
              </div>
            </div>

            {error && <div className="error-banner">⚠️ {error}</div>}

            <button
              type="submit"
              className="btn btn-primary full-button"
              disabled={loading || !isPasswordValid}
            >
              {loading ? "Creating Cognito Account…" : "Create Account & Send Code ↗"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <NavLink to="/login">Sign in ↗</NavLink>
          </p>
        </>
      )}

      {step === 2 && (
        <div className="verify-step-box">
          <h1>Verify Your Email</h1>
          <p className="muted">
            We've sent a 6-digit confirmation code to <strong>{email}</strong>.
            Please enter it below to confirm your account.
          </p>

          <form onSubmit={handleConfirmCode} className="signup-form">
            <div className="form-field">
              <label>6-Digit Confirmation Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="code-input"
                maxLength="6"
                required
              />
            </div>

            {message && <div className="notice info-notice">{message}</div>}
            {error && <div className="error-banner">⚠️ {error}</div>}

            <button
              type="submit"
              className="btn btn-primary full-button"
              disabled={loading}
            >
              {loading ? "Verifying Code…" : "Confirm Account & Activate ↗"}
            </button>

            <div className="resend-row">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                className="text-link-btn"
                onClick={handleResend}
              >
                Resend Code
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="success-step-box">
          <div className="success-icon">✓</div>
          <h1>Account Activated!</h1>
          <p className="muted">
            Your Amazon Cognito account for <strong>{email}</strong> has been
            verified. You can now sign in to monitor yield and configure email
            alerts.
          </p>

          <div className="success-actions">
            <button
              className="btn btn-primary full-button"
              onClick={() => navigate("/login")}
            >
              Proceed to Sign In ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
