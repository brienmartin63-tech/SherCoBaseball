import { describe, expect, it } from "vitest";
import { rollTwoDice, shercoNumber } from "../core/dice";
import { mirrorForLeftHandedBatter, nearestFielder, squaresBetween } from "../core/geometry";
import { classifyPitch, hitNumber, pitchResultLabel } from "../core/pitching";
import { normalize1980Ratings } from "../core/players";
import { actionAllowed, shouldAttemptExtraBase, shouldAutoStealSecond } from "../core/rules";
import { hasScoreboardSpacerAfter, inningLabel, scoreboardInnings } from "../core/scoreboard";
import type { Park } from "../core/types";
import rawParks from "../data/parks.json";

describe("SherCo dice", () => {
  it("reads the lower die first", () => {
    expect(shercoNumber([5, 3])).toBe(35);
    expect(shercoNumber([2, 6])).toBe(26);
  });

  it("replays exactly from the same seed", () => {
    expect(rollTwoDice(19801021, "pitch", "Pitch")).toEqual(rollTwoDice(19801021, "pitch", "Pitch"));
  });
});

describe("1980 pitching chart", () => {
  it("returns the documented B batter versus M pitcher hit number", () => {
    expect(hitNumber("B", "M")).toBe(44);
    expect(classifyPitch(34, 44)).toBe("PROBABLE_OUT");
    expect(classifyPitch(44, 44)).toBe("PROBABLE_HIT");
    expect(classifyPitch(66, 44)).toBe("SPECIAL_EVENT");
    expect(pitchResultLabel(classifyPitch(33, 44))).toBe("Probable Out");
    expect(pitchResultLabel(classifyPitch(56, 44))).toBe("Probable Hit");
    expect(pitchResultLabel(classifyPitch(66, 44))).toBe("Special Event");
  });
});

describe("Brien's rules", () => {
  it("automatically sends ** runners with fewer than two outs, even after a two-strike pickup", () => {
    expect(shouldAutoStealSecond({ speed: "**", outs: 1, secondOccupied: false, twoStrikeCountPickup: true })).toBe(true);
    expect(shouldAutoStealSecond({ speed: "**", outs: 2, secondOccupied: false, twoStrikeCountPickup: false })).toBe(false);
  });

  it("sends * runners only with no outs and no two-strike pickup", () => {
    expect(shouldAutoStealSecond({ speed: "*", outs: 0, secondOccupied: false, twoStrikeCountPickup: false })).toBe(true);
    expect(shouldAutoStealSecond({ speed: "*", outs: 0, secondOccupied: false, twoStrikeCountPickup: true })).toBe(false);
  });

  it("uses the arm 9 and arm 8 extra-base thresholds", () => {
    expect(shouldAttemptExtraBase(9, 9)).toBe(false);
    expect(shouldAttemptExtraBase(9, 10)).toBe(true);
    expect(shouldAttemptExtraBase(8, 7)).toBe(false);
    expect(shouldAttemptExtraBase(8, 8)).toBe(true);
  });

  it("honors chart-mandated steals of home while limiting voluntary steals to second", () => {
    expect(actionAllowed("chart", 4)).toBe(true);
    expect(actionAllowed("managerial", 4)).toBe(false);
    expect(actionAllowed("managerial", 2)).toBe(true);
  });
});

describe("field geometry", () => {
  it("reads row-column coordinates and mirrors the pull field for a left-handed batter", () => {
    expect(mirrorForLeftHandedBatter({ row: 3, column: 10 })).toEqual({ row: 10, column: 3 });
    expect(squaresBetween({ row: 3, column: 10 }, { row: 6, column: 6 })).toBe(4);
  });

  it("breaks a ground-ball distance tie by arm and a fly-ball tie by range", () => {
    const fielders = [
      { position: "SS" as const, at: { row: 5, column: 5 }, arm: 8, range: 5 },
      { position: "3B" as const, at: { row: 5, column: 7 }, arm: 9, range: 4 },
    ];
    expect(nearestFielder({ row: 5, column: 6 }, fielders, "ground")?.position).toBe("3B");
    expect(nearestFielder({ row: 5, column: 6 }, fielders, "fly")?.position).toBe("SS");
  });
});

describe("1980 season-set normalization", () => {
  it("reduces *** to ** and removes modern HP/WP tags without losing source data", () => {
    expect(normalize1980Ratings("A(11)*** [HP] [WP]")).toEqual({
      source: "A(11)*** [HP] [WP]",
      display: "A(11)**",
      speed: "**",
      ignored: ["[HP]", "[WP]"],
    });
  });
});

describe("imported USBL parks", () => {
  const parks = rawParks as unknown as Park[];
  const expectedDefense = ["1B:10-4", "2B:10-7", "3B:4-10", "C:2-2", "CF:18-18", "LF:8-19", "P:6-6", "RF:19-8", "SS:7-10"];

  it("contains five complete 28 by 28 parks", () => {
    expect(parks).toHaveLength(5);
    for (const park of parks) {
      expect(park.cells).toHaveLength(28);
      expect(park.cells.every((row) => row.length === 28)).toBe(true);
    }
  });

  it("preserves the authoritative fixed defensive positions on every diagram", () => {
    for (const park of parks) {
      const defense = park.fielders.map((fielder) => `${fielder.position}:${fielder.at.row}-${fielder.at.column}`).sort();
      expect(defense).toEqual(expectedDefense);
    }
  });
});

describe("scoreboard inning line", () => {
  it("groups regulation innings with a permanent X column for the tenth", () => {
    expect(scoreboardInnings(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(inningLabel(10)).toBe("X");
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(hasScoreboardSpacerAfter)).toEqual([3, 6, 9]);
  });

  it("adds scrollable numeric columns beginning with the eleventh", () => {
    expect(scoreboardInnings(11)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(inningLabel(11)).toBe("11");
  });
});
