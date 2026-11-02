import { unzipSync } from "fflate";
import type {
  AnalysisResult,
  FollowRequest,
  NonFollower,
  Profile,
  RecentActivity,
  UnfollowedProfile,
} from "../types";

// Meta's export uses two entry shapes for account lists:
//
//   older (followers_1.json, following.json):
//     {"title": "user", "string_list_data": [{"href": "...", "value": "user", "timestamp": 123}]}
//   newer (recent_follow_requests.json, pending_follow_requests.json, ...):
//     {"timestamp": 123, "label_values": [{"label": "Username", "value": "user"}, {"label": "Name", ...}]}
//
// profileFromEntry reads either one so every list goes through the same parser.
interface ExportEntry {
  title?: unknown;
  timestamp?: unknown;
  string_list_data?: { href?: unknown; value?: unknown; timestamp?: unknown }[];
  label_values?: { label?: unknown; value?: unknown }[];
}

// Thrown for problems with the file itself; the message is shown to the user
export class ExportError extends Error {
  name = "ExportError";
}

const followersFile = /^followers(_\d+)?\.json$/i;
const followingFile = /^following(_\d+)?\.json$/i;
const recentRequestsFile = /^recent_follow_requests(_\d+)?\.json$/i;
const pendingFile = /^pending_follow_requests(_\d+)?\.json$/i;
const unfollowedFile = /^recently_unfollowed_profiles(_\d+)?\.json$/i;
const expectedDir = /connections\/followers_and_following\//i;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

const utf8 = new TextDecoder("utf-8", { fatal: true });

// Undoes Meta's export encoding, which writes each UTF-8 byte as its own
// \u00XX escape ("Ã©" instead of "é"). Strings that aren't affected are
// returned unchanged.
export const fixMetaEncoding = (s: string): string => {
  const bytes: number[] = [];
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) return s;
    bytes.push(code);
  }
  try {
    return utf8.decode(new Uint8Array(bytes));
  } catch {
    return s;
  }
};

const profileFromEntry = (e: ExportEntry): Profile | null => {
  let username = "";
  let name = "";
  for (const lv of e.label_values ?? []) {
    if (lv.label === "Username") username = str(lv.value);
    else if (lv.label === "Name") name = fixMetaEncoding(str(lv.value));
  }
  let timestamp = num(e.timestamp);

  const first = e.string_list_data?.[0];
  if (first) {
    if (!username) username = str(first.value);
    if (!timestamp) timestamp = num(first.timestamp);
  }
  // following.json leaves value empty and puts the username in title
  if (!username) username = str(e.title);
  if (!username) return null;

  const profile: Profile = { username, profile_url: `https://instagram.com/${username}` };
  if (name) profile.name = name;
  if (timestamp) profile.timestamp = timestamp;
  return profile;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Accepts a bare list of entries, a single entry, or a list wrapped in an
// object such as {"relationships_following": [...]}.
export const parseProfiles = (content: string): Profile[] => {
  const data: unknown = JSON.parse(content);

  let entries: unknown[] = [];
  if (Array.isArray(data)) {
    entries = data;
  } else if (isObject(data)) {
    if ("string_list_data" in data || "label_values" in data) {
      entries = [data];
    } else {
      for (const value of Object.values(data)) {
        if (Array.isArray(value)) entries.push(...value);
      }
    }
  }

  const profiles: Profile[] = [];
  for (const entry of entries) {
    if (!isObject(entry)) continue;
    const profile = profileFromEntry(entry as ExportEntry);
    if (profile) profiles.push(profile);
  }
  return profiles;
};

const baseName = (name: string) => name.slice(name.lastIndexOf("/") + 1);

type Files = Record<string, Uint8Array>;

const text = new TextDecoder();

// Parses every file whose base name matches pattern. When fallback is set and
// no file matches exactly, files it accepts are used instead, for exports with
// unexpected naming.
const readProfiles = (files: Files, pattern: RegExp, fallback?: (name: string) => boolean): Profile[] => {
  const names = Object.keys(files);
  let matched = names.filter((name) => pattern.test(baseName(name)));
  if (matched.length === 0 && fallback) matched = names.filter(fallback);

  const profiles: Profile[] = [];
  for (const name of matched) {
    try {
      profiles.push(...parseProfiles(text.decode(files[name])));
    } catch {
      // Not valid JSON; skip it like the other unreadable files
    }
  }
  return profiles;
};

const isFollowersFallback = (name: string) => {
  const lower = baseName(name).toLowerCase();
  return expectedDir.test(name) && lower.endsWith(".json") && lower.includes("followers") && !lower.includes("following");
};

const isFollowingFallback = (name: string) => {
  const lower = baseName(name).toLowerCase();
  return lower.endsWith(".json") && lower.includes("following") && !lower.includes("followers") && !lower.includes("hashtag");
};

// Only these files are decompressed; the rest of the export is skipped
const isWanted = (name: string) =>
  !name.endsWith("/") &&
  (isFollowersFallback(name) ||
    isFollowingFallback(name) ||
    [followersFile, followingFile, recentRequestsFile, pendingFile, unfollowedFile].some((p) =>
      p.test(baseName(name)),
    ));

const extractRecentActivity = (files: Files, following: NonFollower[], followers: Set<string>): RecentActivity => {
  const followingSet = new Set(following.map((f) => f.username.toLowerCase()));

  const pending = readProfiles(files, pendingFile);
  const pendingSet = new Set(pending.map((p) => p.username.toLowerCase()));

  const followRequests: FollowRequest[] = [];
  for (const p of readProfiles(files, recentRequestsFile)) {
    const key = p.username.toLowerCase();
    if (pendingSet.has(key)) continue;
    // The export doesn't record the outcome, so infer it from the following list
    followRequests.push({ ...p, status: followingSet.has(key) ? "accepted" : "not_accepted" });
  }

  const unfollowed: UnfollowedProfile[] = readProfiles(files, unfollowedFile).map((p) => ({
    ...p,
    follows_you: followers.has(p.username.toLowerCase()),
  }));

  return { follow_requests: followRequests, pending_requests: pending, unfollowed };
};

// An export downloaded in HTML format carries the same lists as .html pages
const isHTMLExport = (names: string[]) =>
  names.some((name) => {
    const lower = name.toLowerCase();
    return lower.endsWith(".html") && lower.includes("follow");
  });

// Finds the accounts you follow that don't follow you back, from the bytes
// of an Instagram data export ZIP. Runs entirely in the browser.
export const analyzeExport = (zip: Uint8Array): AnalysisResult => {
  if (zip.length < 4 || zip[0] !== 0x50 || zip[1] !== 0x4b) {
    throw new ExportError("Invalid file format. Please upload a valid ZIP file.");
  }

  const allNames: string[] = [];
  let files: Files;
  try {
    files = unzipSync(zip, {
      filter: (file) => {
        allNames.push(file.name);
        return isWanted(file.name);
      },
    });
  } catch {
    throw new ExportError("Failed to read ZIP file. Please ensure it's a valid ZIP archive.");
  }

  const followerProfiles = readProfiles(files, followersFile, isFollowersFallback);
  const followers = new Set(followerProfiles.map((p) => p.username.toLowerCase()));

  const following: NonFollower[] = readProfiles(files, followingFile, isFollowingFallback).map((p) => {
    const user: NonFollower = { username: p.username, profile_url: p.profile_url };
    if (p.timestamp) user.followed_at = p.timestamp;
    return user;
  });

  if ((following.length === 0 || followers.size === 0) && isHTMLExport(allNames)) {
    throw new ExportError(
      "This export was downloaded in HTML format. Please request a new export with the format set to JSON.",
    );
  }
  if (following.length === 0) {
    throw new ExportError("No following data found. Please upload a valid Instagram data export.");
  }
  if (followers.size === 0) {
    throw new ExportError("No followers data found. Please upload a valid Instagram data export.");
  }

  const nonFollowers = following.filter((user) => !followers.has(user.username.toLowerCase()));

  return {
    success: true,
    non_followers: nonFollowers,
    total_following: following.length,
    total_followers: followers.size,
    count: nonFollowers.length,
    recent_activity: extractRecentActivity(files, following, followers),
  };
};
