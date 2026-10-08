const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function googleAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    access_type: "offline", prompt: "consent", state,
    scope: "https://www.googleapis.com/auth/business.manage"
  });
  return GOOGLE_AUTH_URL + "?" + params.toString();
}

export async function exchangeGoogleCode({ clientId, clientSecret, redirectUri, code }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
      grant_type: "authorization_code", code
    })
  });
  if (!response.ok) throw new Error("Google OAuth exchange failed: " + response.status);
  return response.json();
}


export async function googleApiGet({ url, accessToken, params = {} }) {
  const query = new URLSearchParams(params);
  const response = await fetch(url + (query.toString() ? "?" + query.toString() : ""), {
    headers: { Authorization: "Bearer " + accessToken }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Google API failed: " + response.status);
  return data;
}
