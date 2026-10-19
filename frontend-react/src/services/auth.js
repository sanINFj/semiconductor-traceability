// WaferIQ AWS Cognito Authentication & Notification Preferences Service

export const COGNITO_REGION = "ap-southeast-2";
export const COGNITO_USER_POOL_ID = "ap-southeast-2_bpw7ATMg1";
export const COGNITO_CLIENT_ID = "v2kj2gagj89sgtlsi661npkph";
export const PREFS_URL =
  "https://i81d4puvul.execute-api.ap-southeast-2.amazonaws.com/preferences";

function getUserPool() {
  if (typeof window === "undefined" || !window.AmazonCognitoIdentity) {
    return null;
  }
  return new window.AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
  });
}

/**
 * Retrieve the current Cognito user's JWT ID token.
 */
export function getWaferIQToken() {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      return reject(
        new Error(
          "Cognito SDK did not load. Check network connection or script tag."
        )
      );
    }
    const user = pool.getCurrentUser();
    if (!user) {
      return reject(new Error("No authenticated user. Please sign in first."));
    }
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return reject(
          err || new Error("User session expired. Please sign in again.")
        );
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

/**
 * Check and restore existing session from browser storage.
 */
export function restoreUserSession() {
  return new Promise((resolve) => {
    const pool = getUserPool();
    if (!pool) return resolve(null);
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return resolve(null);
      }
      const payload = session.getIdToken().payload || {};
      resolve({
        email: payload.email || user.getUsername(),
        sub: payload.sub,
        token: session.getIdToken().getJwtToken(),
      });
    });
  });
}

/**
 * Register a new user in the Amazon Cognito User Pool.
 */
export function signUpUser(email, password) {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      return reject(
        new Error("Cognito authentication SDK is not loaded. Refresh the page.")
      );
    }

    const attributeList = [
      new window.AmazonCognitoIdentity.CognitoUserAttribute({
        Name: "email",
        Value: email.trim(),
      }),
    ];

    pool.signUp(email.trim(), password, attributeList, null, (err, result) => {
      if (err) {
        return reject(
          new Error(err.message || "Registration failed. Check requirements.")
        );
      }
      resolve({
        user: result.user,
        userConfirmed: result.userConfirmed,
        userSub: result.userSub,
      });
    });
  });
}

/**
 * Confirm user registration using the 6-digit verification code sent via email.
 */
export function confirmUserSignUp(email, code) {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      return reject(new Error("Cognito authentication SDK is not loaded."));
    }

    const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser({
      Username: email.trim(),
      Pool: pool,
    });

    cognitoUser.confirmRegistration(code.trim(), true, (err, result) => {
      if (err) {
        return reject(
          new Error(
            err.message || "Invalid or expired verification code. Try again."
          )
        );
      }
      resolve(result); // "SUCCESS"
    });
  });
}

/**
 * Resend email confirmation code if expired.
 */
export function resendConfirmationCode(email) {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      return reject(new Error("Cognito authentication SDK is not loaded."));
    }

    const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser({
      Username: email.trim(),
      Pool: pool,
    });

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        return reject(
          new Error(err.message || "Failed to resend confirmation code.")
        );
      }
      resolve(result);
    });
  });
}

/**
 * Authenticate with Cognito User Pool.
 */
export function signInUser(email, password) {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    if (!pool) {
      return reject(
        new Error("Cognito authentication SDK is not loaded. Refresh the page.")
      );
    }

    const user = new window.AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: pool,
    });

    const details = new window.AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(details, {
      onSuccess: (session) => {
        const payload = session.getIdToken().payload || {};
        resolve({
          email: payload.email || email,
          sub: payload.sub,
          token: session.getIdToken().getJwtToken(),
        });
      },
      onFailure: (err) => {
        reject(
          new Error(
            err.message || "Sign-in failed. Please verify email and password."
          )
        );
      },
      newPasswordRequired: () => {
        reject(
          new Error(
            "Account requires password reset. Complete password change before signing in."
          )
        );
      },
    });
  });
}

/**
 * Sign out the active user.
 */
export function signOutUser() {
  const pool = getUserPool();
  if (pool) {
    const user = pool.getCurrentUser();
    if (user) user.signOut();
  }
}

/**
 * Fetch notification preferences from Lambda DynamoDB backend.
 */
export async function getPreferencesApi(token) {
  const authToken = token || (await getWaferIQToken());
  const response = await fetch(PREFS_URL, {
    method: "GET",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Preferences request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

/**
 * Update notification preferences in Lambda DynamoDB backend.
 */
export async function updatePreferencesApi(enabled, token) {
  const authToken = token || (await getWaferIQToken());
  const response = await fetch(PREFS_URL, {
    method: "PUT",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_alerts_enabled: Boolean(enabled) }),
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Save preferences failed (HTTP ${response.status}).`
    );
  }

  return data;
}
