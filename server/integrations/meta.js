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


export async function metaGraphPost({ path, accessToken, body = {} }) {
  const params = new URLSearchParams({ ...body, access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Meta Graph API failed: ${response.status}`);
  }
  return data;
}


const INSTAGRAM_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com";

export function instagramAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages,instagram_business_manage_insights",
    state
  });
  return INSTAGRAM_AUTH_URL + "?" + params.toString();
}

export async function exchangeInstagramCode({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });
  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json();
  if (!response.ok || data.error_type || data.error_message) {
    throw new Error(data?.error_message || data?.error?.message || `Instagram OAuth exchange failed: ${response.status}`);
  }
  return data;
}

export async function exchangeForLongLivedInstagramToken({ clientSecret, accessToken }) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: accessToken
  });
  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/access_token?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Instagram long-lived token exchange failed: ${response.status}`);
  }
  return data;
}

export async function instagramGraphGet({ path, accessToken, params = {} }) {
  const query = new URLSearchParams({ ...params, access_token: accessToken });
  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}${path}?${query.toString()}`);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Instagram Graph API failed: ${response.status}`);
  }
  return data;
}

export async function instagramGraphPost({ path, accessToken, body = {} }) {
  const params = new URLSearchParams({ ...body, access_token: accessToken });
  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Instagram Graph API failed: ${response.status}`);
  }
  return data;
}
