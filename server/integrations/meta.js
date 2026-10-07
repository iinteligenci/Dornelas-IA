const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const META_AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) throw new Error("Meta OAuth exchange failed: " + response.status);
  return response.json();
}

export async function exchangeForLongLivedMetaToken({ clientId, clientSecret, accessToken }) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: accessToken
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!response.ok) throw new Error("Meta long-lived token exchange failed: " + response.status);
  return response.json();
}

export async function metaGraphGet({ path, accessToken, params = {} }) {
  const query = new URLSearchParams({ ...params, access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}${path}?${query.toString()}`);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Meta Graph API failed: ${response.status}`);
  }
  return data;
}
