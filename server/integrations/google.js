const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function googleAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    access_type: "offline", prompt: "consent", state,
    scope: "https://www.googleapis.com/auth/business.manage"
  });
  return GOOGLE_AUTH_URL + "?" + params.toString();
}
