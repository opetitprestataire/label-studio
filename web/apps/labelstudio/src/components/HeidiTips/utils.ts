import { defaultTipsCollection } from "./content";
import type { Tip, TipsCollection } from "./types";

const STORE_KEY = "heidi_ignored_tips";
const STALE_TIME = 1000 * 60 * 60 * 12; // 12 hours

function getKey(collection: string) {
  return `${STORE_KEY}:${collection}`;
}

export const loadLiveTipsCollection = async () => {
  let abortTimeout: any;
  let cachedData: string | null = null;
  let fetchedAt: string | null = null;

  try {
    cachedData = localStorage.getItem("heidi_live_tips_collection");
    fetchedAt = localStorage.getItem("heidi_live_tips_collection_fetched_at");

    // Read from local storage if the collection is less than STALE_TIME milliseconds old
    if (cachedData && fetchedAt && ((Date.now() - Number.parseInt(fetchedAt)) < STALE_TIME)) {
      return JSON.parse(cachedData);
    }

    const abortController = new AbortController();
    // If we already have a collection, we can be more aggressive with the timeout
    const maxTimeout = fetchedAt ? 2000 : 5000;

    // Abort the request after maxTimeout milliseconds to ensure we don't block for too long, something might be wrong with the network
    abortTimeout = setTimeout(abortController.abort, maxTimeout);

    // Fetch from github raw liveContent.json
    const response = await fetch("https://raw.githubusercontent.com/HumanSignal/label-studio/refs/heads/develop/web/apps/labelstudio/src/components/HeidiTips/liveContent.json", {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
    });

    // Cache the fetched content
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("heidi_live_tips_collection_fetched_at", String(Date.now()));
      localStorage.setItem("heidi_live_tips_collection", JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn("Failed to load live tips collection defaulting to local content", error);
  } finally {
    // Wait until the content is fetched to clear the abort timeout
    // The abort should consider the entire request not just the headers
    clearTimeout(abortTimeout);
  }

  // Serve possibly stale cached content
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Default local content
  return defaultTipsCollection;
};

export async function getRandomTip(collection: keyof TipsCollection): Promise<Tip | null> {
  const tipsCollection = await loadLiveTipsCollection();

  if (isTipDismissed(collection)) return null;

  const tips = tipsCollection[collection];

  const index = Math.floor(Math.random() * tips.length);

  return tips[index];
}

/**
 * Set a cookie that indicates that a collection of tips is dismissed
 * for 30 days
 */
export function dismissTip(collection: string) {
  // will expire in 30 days
  const cookieExpiryTime = 1000 * 60 * 60 * 24 * 30;
  const cookieExpiryDate = new Date();

  cookieExpiryDate.setTime(cookieExpiryDate.getTime() + cookieExpiryTime);

  const finalKey = getKey(collection);
  const cookieValue = `${finalKey}=true`;
  const cookieExpiry = `expires=${cookieExpiryDate.toUTCString()}`;
  const cookiePath = "path=/";
  const cookieString = [cookieValue, cookieExpiry, cookiePath].join("; ");

  document.cookie = cookieString;
}

export function isTipDismissed(collection: string) {
  const cookies = Object.fromEntries(document.cookie.split(";").map((item) => item.trim().split("=")));
  const finalKey = getKey(collection);

  return cookies[finalKey] === "true";
}

export function createURL(url: string, params?: Record<string, string>): string {
  const base = new URL(url);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    base.searchParams.set(key, value);
  });

  const userID = APP_SETTINGS.user?.id;
  const serverID = APP_SETTINGS.server_id;

  if (serverID) base.searchParams.set("server_id", serverID);
  if (userID) base.searchParams.set("user_id", userID);

  return base.toString();
}
