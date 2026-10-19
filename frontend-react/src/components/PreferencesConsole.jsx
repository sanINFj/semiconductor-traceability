import React, { useState, useEffect, useCallback } from "react";
import {
  signInUser,
  signOutUser,
  restoreUserSession,
  getPreferencesApi,
  updatePreferencesApi,
} from "../services/auth";

export default function PreferencesConsole({ onAuthStateChange }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Preferences state
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("NOT_SUBSCRIBED");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadPreferences = useCallback(async (token) => {
    try {
      const data = await getPreferencesApi(token);
      setEmailAlertsEnabled(data.email_alerts_enabled === true);
      setSubscriptionStatus(data.subscription_status || "NOT_SUBSCRIBED");
      setMessage("Preferences loaded from Amazon DynamoDB.");
    } catch (err) {
      setError(`Failed to load preferences: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    restoreUserSession().then((userSession) => {
      if (userSession) {
        setSession(userSession);
        if (onAuthStateChange) onAuthStateChange(userSession);
        loadPreferences(userSession.token);
      }
    });
  }, [onAuthStateChange, loadPreferences]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const userSession = await signInUser(email.trim(), password);
      setSession(userSession);
      setPassword("");
      if (onAuthStateChange) onAuthStateChange(userSession);
      setMessage("Successfully signed in with Amazon Cognito.");
      await loadPreferences(userSession.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOutUser();
    setSession(null);
    setEmailAlertsEnabled(false);
    setSubscriptionStatus("NOT_SUBSCRIBED");
    setMessage("Signed out.");
    if (onAuthStateChange) onAuthStateChange(null);
  };

  const handleSavePreferences = async () => {
    setError(null);
    setMessage(null);
    setSavingPrefs(true);

    try {
      const data = await updatePreferencesApi(emailAlertsEnabled, session?.token);
      setSubscriptionStatus(data.subscription_status || "NOT_SUBSCRIBED");
      setMessage(
        data.message ||
          (data.subscription_status === "PENDING_CONFIRMATION"
            ? "Preference saved. Check your email inbox to confirm the Amazon SNS subscription."
            : "Notification preference updated successfully.")
      );
    } catch (err) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="preferences-console">
      {session ? (
        <div className="authenticated-prefs-box">
          <div className="prefs-header">
            <div>
              <span className="eyebrow">COGNITO AUTHENTICATED SESSION</span>
              <h3>Quality Alert Notification Preferences</h3>
              <p className="muted">
                Authenticated as: <strong>{session.email}</strong>
              </p>
            </div>
            <div className="prefs-status-wrap">
              <span className={`status-pill ${subscriptionStatus.toLowerCase()}`}>
                SNS: {subscriptionStatus.replace("_", " ")}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="prefs-control-card">
            <label className="toggle-switch-row">
              <input
                type="checkbox"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
              />
              <div className="toggle-switch-text">
                <strong>Email Yield Excursion Alerts</strong>
                <p>
                  Receive automated Amazon SNS alerts when a semiconductor lot
                  triggers an <code>ALERT</code> status (yield drop &ge; 5.0 pp).
                </p>
              </div>
            </label>

            <div className="prefs-action-bar">
              <button
                className="btn btn-primary"
                onClick={handleSavePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs ? "Saving to DynamoDB…" : "Save Notification Preferences ↗"}
              </button>
            </div>
          </div>

          {message && <div className="notice info-notice mt-4">{message}</div>}
          {error && <div className="error-banner mt-4">Notice: {error}</div>}

          <div className="notice warning-notice mt-4">
            <strong>Amazon SNS Subscription Verification:</strong> AWS SNS requires
            recipient confirmation. When enabling alerts for the first time, check
            your inbox for an AWS confirmation link before alerts can be delivered.
          </div>
        </div>
      ) : (
        <div className="signin-box">
          <div className="eyebrow">AMAZON COGNITO AUTHENTICATION</div>
          <h3>Sign in to Manage Quality Alerts</h3>
          <p className="muted">
            Authenticate using your verified semiconductor engineering account to
            manage DynamoDB notification preferences and SNS alerts.
          </p>

          <form onSubmit={handleSignIn} className="signin-form">
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
              <label>Cognito Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                required
              />
            </div>

            {error && <div className="error-banner">Notice: {error}</div>}
            {message && <div className="notice info-notice">{message}</div>}

            <button
              type="submit"
              className="btn btn-primary full-button"
              disabled={loading}
            >
              {loading ? "Authenticating with Cognito…" : "Sign In with AWS Cognito ↗"}
            </button>
          </form>

          <div className="notice mt-4">
            <strong>Cognito Pool:</strong> <code>ap-southeast-2_bpw7ATMg1</code> · Client ID: <code>v2kj2gag...</code>
          </div>
        </div>
      )}
    </div>
  );
}
