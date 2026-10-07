const META_AUTH_URL = "https://www.facebook.com/v24.0/dialog/oauth";

export function metaAuthorizeUrl({ clientId, redirectUri, state, configId }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    config_id: configId
  });
  return META_AUTH_URL + "?" + params.toString();
}

export async function exchangeMetaCode({ clientId, clientSecret, redirectUri, code }) {
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code });
  const response = await fetch("https://graph.facebook.com/v24.0/oauth/access_token?" + params.toString());
  if (!response.ok) throw new Error("Meta OAuth exchange failed: " + response.status);
  return response.json();
}
