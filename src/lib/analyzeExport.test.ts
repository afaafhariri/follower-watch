import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { analyzeExport, ExportError, fixMetaEncoding } from "./analyzeExport";

const createTestZip = (files: Record<string, string>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])));

const labeledEntry = (username: string, name: string, ts: number) =>
  JSON.stringify({
    timestamp: ts,
    media: [],
    label_values: [
      { label: "URL", value: `https://www.instagram.com/${username}` },
      { label: "Name", value: name },
      { label: "Username", value: username },
    ],
    fbid: "1",
  });

const testDir = "connections/followers_and_following/";
const testFollowers = `[
  {"string_list_data": [{"value": "user1", "timestamp": 1}]},
  {"string_list_data": [{"value": "user2", "timestamp": 2}]}
]`;
const testFollowing = `{"relationships_following": [
  {"title": "user1", "string_list_data": [{"href": "https://www.instagram.com/_u/user1", "timestamp": 1}]},
  {"title": "user3", "string_list_data": [{"href": "https://www.instagram.com/_u/user3", "timestamp": 3}]}
]}`;

const analyzeFiles = (files: Record<string, string>) => analyzeExport(createTestZip(files));

describe("analyzeExport", () => {
  it("finds accounts that don't follow back", () => {
    const result = analyzeFiles({
      [testDir + "followers_1.json"]: testFollowers,
      [testDir + "following.json"]: `{"relationships_following": [
        {"title": "user1", "string_list_data": [{"href": "https://instagram.com/user1", "timestamp": 1234567890}]},
        {"title": "user3", "string_list_data": [{"href": "https://instagram.com/user3", "timestamp": 1234567892}]},
        {"title": "USER2", "string_list_data": [{"href": "https://instagram.com/USER2", "timestamp": 1234567893}]}
      ]}`,
    });

    expect(result.count).toBe(1);
    expect(result.non_followers).toEqual([
      { username: "user3", profile_url: "https://instagram.com/user3", followed_at: 1234567892 },
    ]);
    expect(result.total_followers).toBe(2);
    expect(result.total_following).toBe(3);
  });

  it("rejects a file that isn't a ZIP", () => {
    expect(() => analyzeExport(strToU8("not a zip file"))).toThrow(ExportError);
  });

  it("rejects a corrupt ZIP", () => {
    const zip = createTestZip({ [testDir + "followers_1.json"]: testFollowers });
    expect(() => analyzeExport(zip.slice(0, 40))).toThrow(/Failed to read ZIP/);
  });

  it("derives follow request status and unfollowed follows_you", () => {
    const activity = analyzeFiles({
      [testDir + "followers_1.json"]: testFollowers,
      [testDir + "following.json"]: testFollowing,
      [testDir + "recent_follow_requests.json"]: `[${[
        labeledEntry("user3", "Accepted Request", 10),
        labeledEntry("user5", "Pending Request", 11),
        labeledEntry("user6", "Declined Request", 12),
      ].join(",")}]`,
      [testDir + "pending_follow_requests.json"]: `[${labeledEntry("user5", "Pending Request", 11)}]`,
      [testDir + "recently_unfollowed_profiles.json"]: `[${[
        labeledEntry("user2", "Still Follows", 20),
        labeledEntry("user7", "Gone", 21),
      ].join(",")}]`,
    }).recent_activity!;

    // user5 is still pending, so it's only listed under pending_requests
    expect(activity.follow_requests.map((r) => [r.username, r.status, r.name, r.timestamp])).toEqual([
      ["user3", "accepted", "Accepted Request", 10],
      ["user6", "not_accepted", "Declined Request", 12],
    ]);
    expect(activity.pending_requests.map((p) => p.username)).toEqual(["user5"]);
    expect(activity.unfollowed.map((u) => [u.username, u.follows_you])).toEqual([
      ["user2", true],
      ["user7", false],
    ]);
  });

  it("returns empty activity lists when the optional files are missing", () => {
    const result = analyzeFiles({
      [testDir + "followers_1.json"]: testFollowers,
      [testDir + "following.json"]: testFollowing,
    });
    expect(result.recent_activity).toEqual({ follow_requests: [], pending_requests: [], unfollowed: [] });
  });

  it("reads follow lists in the label_values shape", () => {
    const result = analyzeFiles({
      [testDir + "followers_1.json"]: `[${labeledEntry("user1", "One", 1)}]`,
      [testDir + "following.json"]: `[${labeledEntry("user1", "One", 1)},${labeledEntry("user3", "Three", 3)}]`,
    });
    expect(result.non_followers.map((u) => u.username)).toEqual(["user3"]);
  });

  it("ignores followed hashtags", () => {
    const result = analyzeFiles({
      [testDir + "followers_1.json"]: testFollowers,
      [testDir + "following.json"]: testFollowing,
      [testDir + "following_hashtags.json"]:
        `{"relationships_following_hashtags": [{"title": "sunsets", "string_list_data": [{"value": "sunsets"}]}]}`,
    });
    expect(result.total_following).toBe(2);
  });

  it("explains HTML-format exports", () => {
    expect(() =>
      analyzeFiles({
        [testDir + "followers_1.html"]: "<html></html>",
        [testDir + "following.html"]: "<html></html>",
      }),
    ).toThrow(/HTML/);
  });

  it("reports missing lists", () => {
    expect(() => analyzeFiles({ [testDir + "followers_1.json"]: testFollowers })).toThrow(/No following data/);
    expect(() => analyzeFiles({ [testDir + "following.json"]: testFollowing })).toThrow(/No followers data/);
  });
});

describe("fixMetaEncoding", () => {
  it.each([
    ["RenÃ©e", "Renée"],
    ["Heba ð\u009f\u0098\u008a", "Heba 😊"],
    ["plain ascii", "plain ascii"],
    ["already Renée", "already Renée"], // valid text is left alone
    ["lone é", "lone é"], // not valid UTF-8 once re-read as bytes
  ])("%j → %j", (input, want) => {
    expect(fixMetaEncoding(input)).toBe(want);
  });
});
