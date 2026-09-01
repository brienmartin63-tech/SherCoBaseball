import { describe, expect, it } from "vitest";
import { rollOneDie, rollTwoDice, shercoNumber } from "../core/dice";
import { directPitchResult, effectivePowerRatings, moveBehindFielder, moveInFrontOfFielder, resolveBasesEmptyBattedBall, resolveBasesEmptySpecialEvent, specialEventPitcherRate, withinHomeRunRating } from "../core/chartResolution";
import { advanceTestBatter, canAdvanceTestBatter, createInitialGame, rollPitch, rollResolution } from "../core/game";
import { farthestInPlaySquare, HOME_PLATE_SQUARE, mirrorForLeftHandedBatter, nearestFielder, squaresBetween } from "../core/geometry";
import { classifyPitch, hitNumber, pitchResultLabel } from "../core/pitching";
import { normalize1980Ratings } from "../core/players";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";
import { actionAllowed, shouldAttemptExtraBase, shouldAutoStealSecond } from "../core/rules";
import { hasScoreboardSpacerAfter, inningLabel, scoreboardInnings, scoreboardTeamName } from "../core/scoreboard";
import { migrateGameState } from "../core/storage";
import type { Park } from "../core/types";
import rawParks from "../data/parks.json";
import { kansasCity, philadelphia } from "../data/demo";
import { BASES_EMPTY_PROBABLE_HIT, BASES_EMPTY_PROBABLE_OUT, SHERCO_CHART_ROLLS } from "../data/charts1980";

describe("SherCo dice", () => {
  it("reads the lower die first", () => {
    expect(shercoNumber([5, 3])).toBe(35);
    expect(shercoNumber([2, 6])).toBe(26);
  });

  it("replays exactly from the same seed", () => {
    expect(rollTwoDice(19801021, "pitch", "Pitch")).toEqual(rollTwoDice(19801021, "pitch", "Pitch"));
    expect(rollOneDie(19801021, "chart", "Special")).toEqual(rollOneDie(19801021, "chart", "Special"));
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

  it("checks BB/K only after a probable out", () => {
    expect(directPitchResult(11, "11–14")).toBe("WALK");
    expect(directPitchResult(12, "11–14")).toBe("STRIKEOUT");
    expect(directPitchResult(14, "11–14")).toBe("STRIKEOUT");
    expect(directPitchResult(15, "11–14")).toBeUndefined();
    expect(directPitchResult(11, "n–11")).toBe("STRIKEOUT");
    expect(directPitchResult(11, "11–n")).toBe("WALK");
  });
});

describe("1980 bases-empty chart engine", () => {
  const park = rawParks[0] as unknown as Park;

  it("contains every valid two-die result in both batted-ball charts", () => {
    expect(Object.keys(BASES_EMPTY_PROBABLE_HIT).map(Number)).toEqual(SHERCO_CHART_ROLLS);
    expect(Object.keys(BASES_EMPTY_PROBABLE_OUT).map(Number)).toEqual(SHERCO_CHART_ROLLS);
  });

  it("uses the HR clause and mirrors switch hitters against right-handed pitchers", () => {
    expect(withinHomeRunRating(16, 16)).toBe(true);
    expect(withinHomeRunRating(22, 16)).toBe(false);
    const homeRun = resolveBasesEmptyBattedBall("PROBABLE_HIT", 16, philadelphia.lineup[2], kansasCity.starter, park, 0);
    expect(homeRun.ballAt).toEqual({ row: 3, column: 26 });
    expect(homeRun).toMatchObject({ phase: "DIRECT_RESULT", terminalOutcome: "HOME_RUN" });

    const pulledFly = resolveBasesEmptyBattedBall("PROBABLE_OUT", 45, philadelphia.lineup[0], kansasCity.starter, park, 0);
    expect(pulledFly.ballAt).toEqual({ row: 20, column: 18 });
  });

  it("raises HR and triple numbers one SherCo step against a + pitcher", () => {
    const mcBride = philadelphia.lineup[1];
    expect(effectivePowerRatings(mcBride, kansasCity.starter)).toEqual({ homeRun: 12, triple: 13, gopherAdjusted: true });
    expect(effectivePowerRatings(kansasCity.lineup[0], kansasCity.starter)).toEqual({ homeRun: 11, triple: 12, gopherAdjusted: true });
    expect(effectivePowerRatings(mcBride, { ...kansasCity.starter, ratingPrefix: undefined })).toEqual({ homeRun: 11, triple: 12, gopherAdjusted: false });
  });

  it("treats McBride's PH 12 as a gopher-adjusted HR result, not his printed triple number", () => {
    const mcBride = philadelphia.lineup[1];
    const resolution = resolveBasesEmptyBattedBall("PROBABLE_HIT", 12, mcBride, kansasCity.starter, park, 0, true);
    expect(resolution).toMatchObject({ phase: "DIRECT_RESULT", terminalOutcome: "HOME_RUN" });
    expect(resolution.ballAt).toEqual({ row: 27, column: 12 });
    expect(resolution.description).toContain("HR 11→12, triple 12→13");
    expect(resolution.description).toContain("beyond the fence");
  });

  it("calls Schmidt's gopher-adjusted PH 13 a home run at 14-28", () => {
    const schmidt = philadelphia.lineup[2];
    expect(effectivePowerRatings(schmidt, kansasCity.starter)).toEqual({ homeRun: 22, triple: 23, gopherAdjusted: true });
    const resolution = resolveBasesEmptyBattedBall("PROBABLE_HIT", 13, schmidt, kansasCity.starter, park, 0, true);
    expect(resolution).toMatchObject({ phase: "DIRECT_RESULT", terminalOutcome: "HOME_RUN", ballAt: { row: 14, column: 28 } });
  });

  it("invokes Brien's farthest-square triple option on McBride's adjusted 13", () => {
    const mcBride = philadelphia.lineup[1];
    const triplePark = rawParks[1] as unknown as Park;
    expect(farthestInPlaySquare(triplePark)).toEqual({ row: 26, column: 18 });
    const resolution = resolveBasesEmptyBattedBall("PROBABLE_HIT", 13, mcBride, kansasCity.starter, triplePark, 0, true);
    expect(resolution).toMatchObject({ phase: "BALL_IN_PLAY", ballAt: { row: 26, column: 18 } });
    expect(squaresBetween(HOME_PLATE_SQUARE, resolution.ballAt!)).toBe(24);
    expect(resolution.description).toContain("possible triple");

    const officialChoice = resolveBasesEmptyBattedBall("PROBABLE_HIT", 13, mcBride, kansasCity.starter, triplePark, 0, false);
    expect(officialChoice.phase).toBe("TRIPLE_DECISION");
  });

  it("does not use the batter's pull field to choose an equally distant triple square", () => {
    const sundome = rawParks[4] as unknown as Park;
    expect(farthestInPlaySquare(sundome)).toEqual({ row: 25, column: 18 });
    const schmidtTriple = resolveBasesEmptyBattedBall("PROBABLE_HIT", 23, philadelphia.lineup[2], kansasCity.starter, sundome, 0, true);
    expect(schmidtTriple.ballAt).toEqual({ row: 25, column: 18 });
  });

  it("moves in front of and behind fielders on straight field lanes", () => {
    expect(moveInFrontOfFielder({ row: 8, column: 19 }, 1)).toEqual({ row: 8, column: 18 });
    expect(moveInFrontOfFielder({ row: 19, column: 8 }, 1)).toEqual({ row: 18, column: 8 });
    expect(moveInFrontOfFielder({ row: 18, column: 18 }, 2)).toEqual({ row: 16, column: 16 });
    expect(moveBehindFielder({ row: 18, column: 18 }, 5)).toEqual({ row: 23, column: 23 });
  });

  it("places relative Probable Out liners on their named straight lanes", () => {
    const liner = resolveBasesEmptyBattedBall("PROBABLE_OUT", 15, philadelphia.lineup[0], kansasCity.starter, park, 0);
    const rightFielder = park.fielders.find((fielder) => fielder.position === "RF")!;
    expect(rightFielder.at).toEqual({ row: 19, column: 8 });
    expect(liner.ballAt).toEqual({ row: 18, column: 8 });

    const centerLiner = resolveBasesEmptyBattedBall("PROBABLE_OUT", 25, philadelphia.lineup[0], kansasCity.starter, park, 0);
    expect(centerLiner.ballAt).toEqual({ row: 16, column: 16 });
  });

  it("advances deterministically from pitch to chart to a ball on the field", () => {
    const initial = createInitialGame(park.id, 2690);
    const pitched = rollPitch(initial, philadelphia.lineup[0], kansasCity.starter);
    expect(pitched.lastRoll?.sherco).toBe(23);
    expect(pitched.resolution).toMatchObject({ phase: "BATTED_BALL_CHART", chartFamily: "PROBABLE_OUT" });
    const charted = rollResolution(pitched, philadelphia.lineup[0], kansasCity.starter, park);
    expect(charted.lastRoll?.sherco).toBe(12);
    expect(charted.resolution.phase).toBe("BALL_IN_PLAY");
    expect(charted.ballAt).toEqual({ row: 22, column: 7 });
  });

  it("stops a BB/K strikeout before any batted-ball chart roll", () => {
    const initial = createInitialGame(park.id, 19801021);
    const pitched = rollPitch(initial, philadelphia.lineup[0], kansasCity.starter);
    expect(pitched.lastRoll?.sherco).toBe(13);
    expect(pitched.lastRoll?.resultLabel).toBe("Strikeout");
    expect(pitched.resolution.phase).toBe("DIRECT_RESULT");
  });

  it("changes J/K/Y/Z pitcher rates instead of rolling a Special Event", () => {
    expect(["J", "K", "Y", "Z"].map((rate) => specialEventPitcherRate(rate as "J" | "K" | "Y" | "Z"))).toEqual(["K", "L", "X", "Y"]);
    expect(specialEventPitcherRate("M")).toBeUndefined();
    const initial = createInitialGame(park.id, 13328);
    const jPitcher = { ...kansasCity.starter, rate: "J" as const };
    const pitched = rollPitch(initial, philadelphia.lineup[0], jPitcher);
    expect(pitched.lastRoll?.sherco).toBe(66);
    expect(pitched.activePitcherRate).toBe("K");
    expect(pitched.resolution.phase).toBe("PITCH");
  });

  it("routes the one-or-two-out result 26 through its pitcher-error check", () => {
    const resolution = resolveBasesEmptyBattedBall("PROBABLE_OUT", 26, philadelphia.lineup[0], kansasCity.starter, park, 1);
    expect(resolution).toMatchObject({ phase: "PITCHER_ERROR_CHECK", ballAt: { row: 6, column: 6 } });
  });

  it("stops a called-strike Special Event at the unimplemented count boundary", () => {
    const resolution = resolveBasesEmptySpecialEvent(4, philadelphia.lineup[0], kansasCity.starter, park);
    expect(resolution.phase).toBe("COUNT_PENDING");
  });
});

describe("saved-game schema", () => {
  it("migrates a 0.1.x game into the version-two plate-appearance state", () => {
    const current = createInitialGame("test-park");
    const { schemaVersion: _schemaVersion, resolution: _resolution, ...legacy } = current;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.resolution).toEqual({ phase: "PITCH", baseState: "EMPTY" });
  });
});

describe("temporary multi-at-bat validation", () => {
  const park = rawParks[0] as unknown as Park;

  it("advances only after reaching an honest engine boundary", () => {
    const initial = createInitialGame(park.id, 2690);
    expect(canAdvanceTestBatter(initial)).toBe(false);
    expect(advanceTestBatter(initial, 9, 9)).toBe(initial);

    const pitched = rollPitch(initial, philadelphia.lineup[0], kansasCity.starter);
    const charted = rollResolution(pitched, philadelphia.lineup[0], kansasCity.starter, park);
    expect(canAdvanceTestBatter(charted)).toBe(true);

    const next = advanceTestBatter(charted, philadelphia.lineup.length, kansasCity.lineup.length);
    expect(next.awayBatterIndex).toBe(1);
    expect(next.resolution).toMatchObject({ phase: "PITCH", baseState: "EMPTY" });
    expect(next.seed).toBe(charted.seed);
    expect(next.events).toEqual(charted.events);
    expect(next.ballAt).toBeUndefined();
    expect(next.lastRoll).toBeUndefined();
  });

  it("cycles from the ninth hitter back to the leadoff hitter", () => {
    const terminal = { ...createInitialGame(park.id), awayBatterIndex: 8, resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const } };
    expect(advanceTestBatter(terminal, 9, 9).awayBatterIndex).toBe(0);
  });

  it("runs an entire test lineup through independent deterministic plate appearances", () => {
    let game = createInitialGame(park.id);
    const seenResults = new Set<string>();
    for (let plateAppearance = 0; plateAppearance < philadelphia.lineup.length; plateAppearance += 1) {
      let rolls = 0;
      while (!canAdvanceTestBatter(game) && rolls < 8) {
        const batter = philadelphia.lineup[game.awayBatterIndex];
        game = game.resolution.phase === "PITCH"
          ? rollPitch(game, batter, kansasCity.starter)
          : rollResolution(game, batter, kansasCity.starter, park);
        if (game.lastRoll?.resultLabel) seenResults.add(game.lastRoll.resultLabel);
        rolls += 1;
      }
      expect(canAdvanceTestBatter(game)).toBe(true);
      game = advanceTestBatter(game, philadelphia.lineup.length, kansasCity.lineup.length);
    }
    expect(game.awayBatterIndex).toBe(0);
    expect(seenResults.has("Probable Out")).toBe(true);
    expect(seenResults.has("Probable Hit")).toBe(true);
    expect(seenResults.size).toBeGreaterThanOrEqual(4);
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
    expect(mirrorForLeftHandedBatter({ row: 8, column: 19 })).toEqual({ row: 19, column: 8 });
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

describe("complete printed ratings", () => {
  it("shows batter home-run, triple, clutch, and speed ratings", () => {
    expect(formatBatterRating(philadelphia.lineup[2])).toBe("#B16(22)");
    expect(formatBatterRating(kansasCity.lineup[0])).toBe("A(11)**");
    expect(formatBatterRating(kansasCity.lineup[2])).toBe("#AA12(13)");
  });

  it("shows pitcher prefix, rate, effective innings, fatigue rate, and BB-K range", () => {
    expect(formatPitcherRating(kansasCity.starter)).toBe("+M8/X (11–14)");
    expect(formatPitcherRating(philadelphia.bullpen[0])).toBe("−J2/Z (11–15)");
  });

  it("carries the compact live AVG-HR-RBI lineup statistics", () => {
    expect(philadelphia.lineup.slice(0, 3).map((player) => [player.average, player.homeRuns, player.runsBattedIn])).toEqual([
      [.282, 0, 14],
      [.309, 11, 56],
      [.286, 48, 119],
    ]);
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
  it("uses the visiting city and home nickname on the park scoreboard", () => {
    expect(scoreboardTeamName(philadelphia, "away")).toBe("Philadelphia");
    expect(scoreboardTeamName(kansasCity, "home")).toBe("Royals");
  });

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
