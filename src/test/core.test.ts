import { describe, expect, it } from "vitest";
import { rollOneDie, rollTwoDice, shercoNumber } from "../core/dice";
import { applyTwoOutPreThrowAdvance, homeThrowChoices, leadRunnerDecisions, runnerDistance, runnerDistanceTone, twoOutHitAndRunDestination } from "../core/baserunning";
import { basesEmptyErrorFielder, directPitchResult, effectivePowerRatings, moveBehindFielder, moveInFrontOfFielder, resolveBasesEmptyBattedBall, resolveBasesEmptyError, resolveBasesEmptySpecialEvent, resolveBasesEmptySuperiorError, specialEventPitcherRate, withinHomeRunRating } from "../core/chartResolution";
import { createInitialGame, resolveFielding, rollPitch, rollResolution, scoreDirectResult, selectPitcher, startNextPlateAppearance } from "../core/game";
import { automaticUmpireCall, buildRatedDefense, createFieldingAttempt, pivotRulePenalty, resolveContinuousPlay, resolveThrow } from "../core/fielding";
import { BASE_REFERENCE_SQUARES, directPath, distanceToBase, farthestInPlaySquare, HOME_PLATE_SQUARE, mirrorForLeftHandedBatter, nearestFielder, resolveGroundBallRicochet, squaresBetween } from "../core/geometry";
import { classifyPitch, hitNumber, pitchResultLabel } from "../core/pitching";
import { normalize1980Ratings } from "../core/players";
import { formatBatterRating, formatPitcherRating } from "../core/ratings";
import { actionAllowed, shouldAttemptExtraBase, shouldAutoStealSecond } from "../core/rules";
import { hasScoreboardSpacerAfter, inningLabel, scoreboardInnings, scoreboardInningValue, scoreboardTeamName } from "../core/scoreboard";
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
    expect(squaresBetween(HOME_PLATE_SQUARE, resolution.ballAt!)).toBe(23);
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

  it("sends Brien's PH 66 directly to the error chart while preserving the official check", () => {
    const batter = kansasCity.lineup[2];
    expect(resolveBasesEmptyBattedBall("PROBABLE_HIT", 66, batter, philadelphia.starter, park, 2, true)).toMatchObject({
      phase: "ERROR_CHART",
      chartFamily: "HIT_ERROR",
    });
    expect(resolveBasesEmptyBattedBall("PROBABLE_HIT", 66, batter, philadelphia.starter, park, 2, false)).toMatchObject({
      phase: "HIT_ERROR_CHECK",
      chartFamily: "HIT_ERROR",
    });
  });

  it("stops a called-strike Special Event at the unimplemented count boundary", () => {
    const resolution = resolveBasesEmptySpecialEvent(4, philadelphia.lineup[0], kansasCity.starter, park);
    expect(resolution.phase).toBe("COUNT_PENDING");
  });
});

describe("saved-game schema", () => {
  it("migrates a 0.1.x game into the version-four game-day state", () => {
    const current = createInitialGame("test-park");
    const { schemaVersion: _schemaVersion, resolution: _resolution, runners: _runners, activePitchers: _activePitchers, ...legacy } = current;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.resolution).toEqual({ phase: "PITCH", baseState: "EMPTY" });
    expect(migrated.runners).toEqual({});
    expect(migrated.activePitchers).toEqual({});
  });
});

describe("bases-empty fielding and running", () => {
  const park = rawParks[0] as unknown as Park;

  it("uses the four-number workbook distances without including fielder movement", () => {
    expect(BASE_REFERENCE_SQUARES).toEqual({
      HOME: { row: 3, column: 3 },
      FIRST: { row: 8, column: 3 },
      SECOND: { row: 8, column: 8 },
      THIRD: { row: 3, column: 8 },
    });
    expect(distanceToBase({ row: 9, column: 6 }, "FIRST")).toBe(3);
    expect(distanceToBase({ row: 23, column: 8 }, "SECOND")).toBe(15);
    const attempt = {
      batterId: "batter",
      ballAt: { row: 23, column: 8 },
      battedBallType: "ground" as const,
      fielderPosition: "CF" as const,
      fielderName: "Center Fielder",
      fielderAt: { row: 18, column: 8 },
      arm: 9 as const,
      range: 5 as const,
      fieldingDistance: 5,
      targetBase: "SECOND" as const,
      targetDistance: 23,
    };
    const throwResult = resolveThrow(attempt, 12);
    expect(throwResult.allowance).toBe(12);
    expect(throwResult.remaining).toBe(7);
    expect(throwResult.result).toBe("SAFE");
  });

  it("loads the season-set defense at the fixed park positions", () => {
    const defense = buildRatedDefense(kansasCity, kansasCity.starter, park);
    expect(defense.find((fielder) => fielder.position === "2B")).toMatchObject({ name: "Frank White", arm: 9, range: 5, at: { row: 10, column: 7 } });
    expect(defense.find((fielder) => fielder.position === "1B")).toMatchObject({ name: "Willie Aikens", arm: 8, range: 4, at: { row: 10, column: 4 } });
  });

  it("records an airborne out when the nearest fielder is within range", () => {
    const state = {
      ...createInitialGame(park.id),
      ballAt: { row: 18, column: 8 },
      resolution: { phase: "BALL_IN_PLAY" as const, baseState: "EMPTY" as const, battedBallType: "fly" as const, ballAt: { row: 18, column: 8 } },
    };
    const fielded = resolveFielding(state, philadelphia.lineup[0], kansasCity.starter, park, kansasCity, 9, 9);
    expect(fielded.resolution.phase).toBe("PLAY_COMPLETE");
    expect(fielded.outs).toBe(1);
    expect(fielded.awayBatterIndex).toBe(1);
    expect(fielded.events[0].officialText).toContain("Amos Otis");
    expect(fielded.lastFielding).toMatchObject({ fielderName: "Amos Otis", fieldingDistance: 1, targetBase: "FIRST" });
    expect(startNextPlateAppearance(fielded).lastFielding).toBeUndefined();
  });

  it("charges movement before an infielder throws to first", () => {
    const defense = buildRatedDefense(kansasCity, kansasCity.starter, park);
    const attempt = createFieldingAttempt(philadelphia.lineup[0], park, defense, { row: 10, column: 6 }, "ground");
    expect(attempt).toMatchObject({ fielderName: "Frank White", fieldingDistance: 1, targetDistance: 3, arm: 9 });
    expect(resolveThrow(attempt, 6)).toMatchObject({ allowance: 9, remaining: 8, result: "OUT" });
  });

  it("sends exact-count throws to the automatic umpire", () => {
    const state = {
      ...createInitialGame(park.id, 1),
      ballAt: { row: 1, column: 4 },
      resolution: { phase: "BALL_IN_PLAY" as const, baseState: "EMPTY" as const, battedBallType: "ground" as const, ballAt: { row: 1, column: 4 } },
    };
    const tied = resolveFielding(state, philadelphia.lineup[0], kansasCity.starter, park, kansasCity, 9, 9);
    expect(tied.resolution.phase).toBe("UMPIRE_CHECK");
    expect(tied.pendingFielding).toMatchObject({ fielderPosition: "C", fieldingDistance: 2, targetDistance: 7, throwingAllowance: 9, throwingRemainder: 7 });
    expect(automaticUmpireCall(33, 9, "REGULAR")).toBe("OUT");
    expect(automaticUmpireCall(34, 9, "REGULAR")).toBe("SAFE");
    expect(automaticUmpireCall(66, 9, "REGULAR")).toBe("OUT");
  });

  it("continues Porter's ricochet grounder through the mandatory throws to a triple", () => {
    const phoenix = rawParks.find((candidate) => candidate.id === "sundome") as unknown as Park;
    const porter = kansasCity.lineup[6];

    const plotted = {
      ...createInitialGame(phoenix.id, 2722),
      half: "bottom" as const,
      homeBatterIndex: 6,
      ballAt: { row: 26, column: 9 },
      resolution: {
        phase: "BALL_IN_PLAY" as const,
        baseState: "EMPTY" as const,
        chartFamily: "PROBABLE_HIT" as const,
        battedBallType: "ground" as const,
        ballAt: { row: 26, column: 9 },
      },
    };

    const toFirst = resolveFielding(plotted, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(toFirst.lastFielding?.ricochet).toMatchObject({
      originalLandingAt: { row: 26, column: 9 },
      fenceAt: { row: 25, column: 9 },
      depth: 1,
    });
    expect(toFirst.lastFielding).toMatchObject({
      fielderName: "Bake McBride",
      ballAt: { row: 25, column: 9 },
      fieldingDistance: 6,
      throwingAllowance: 8,
      throwingRemainder: 2,
    });
    expect(toFirst).toMatchObject({
      ballAt: { row: 23, column: 7 },
      runners: { first: porter.id },
      resolution: { phase: "RUNNER_ADVANCE", baseState: "FIRST" },
      pendingFielding: { targetBase: "SECOND", targetDistance: 15, fieldingDistance: 0 },
    });

    const toSecond = resolveFielding(toFirst, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(toSecond).toMatchObject({
      ballAt: { row: 15, column: 8 },
      runners: { second: porter.id },
      resolution: { phase: "RUNNER_ADVANCE", baseState: "SECOND" },
      pendingFielding: { targetBase: "THIRD", targetDistance: 12, fieldingDistance: 0 },
    });

    const exactAtThird = resolveFielding({ ...toSecond, seed: 13328 }, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(exactAtThird).toMatchObject({
      ballAt: { row: 3, column: 8 },
      runners: { second: porter.id },
      resolution: { phase: "UMPIRE_CHECK", baseState: "SECOND" },
      pendingFielding: { targetBase: "THIRD", throwingRemainder: 12 },
    });

    const safeAtThird = resolveFielding({ ...exactAtThird, seed: 2722 }, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(safeAtThird).toMatchObject({
      runners: { third: porter.id },
      resolution: { phase: "PLAY_COMPLETE", terminalOutcome: "TRIPLE" },
      home: { hits: 1 },
    });

    const toThird = resolveFielding(toSecond, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(toThird).toMatchObject({
      ballAt: { row: 7, column: 8 },
      runners: { third: porter.id },
      resolution: { phase: "PLAY_COMPLETE", baseState: "THIRD", terminalOutcome: "TRIPLE" },
      home: { hits: 1 },
    });

    const caughtStretching = resolveFielding({
      ...toFirst,
      seed: 13328,
      ballAt: { row: 10, column: 8 },
      resolution: { ...toFirst.resolution, phase: "RUNNER_ADVANCE" as const, ballAt: { row: 10, column: 8 } },
      pendingFielding: {
        ...toFirst.pendingFielding!,
        ballAt: { row: 10, column: 8 },
        targetBase: "SECOND" as const,
        targetDistance: 2,
        fieldingDistance: 0,
      },
    }, porter, philadelphia.starter, phoenix, philadelphia, 9, 9);
    expect(caughtStretching).toMatchObject({
      outs: 1,
      runners: {},
      resolution: { phase: "PLAY_COMPLETE", terminalOutcome: "OUT", awardedBase: "FIRST", creditedHit: true },
      home: { hits: 1 },
    });
  });

  it("scores a strikeout and advances cleanly to the next batter", () => {
    const direct = { ...createInitialGame(park.id), resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const, terminalOutcome: "STRIKEOUT" as const } };
    const scored = scoreDirectResult(direct, philadelphia.lineup[0], 9, 9);
    expect(scored).toMatchObject({ outs: 1, awayBatterIndex: 1, resolution: { phase: "PLAY_COMPLETE", baseState: "EMPTY" } });
    expect(startNextPlateAppearance(scored).resolution.phase).toBe("PITCH");
  });

  it("places a batter on first and can clear the bases only for continued testing", () => {
    const direct = { ...createInitialGame(park.id), resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const, terminalOutcome: "WALK" as const } };
    const scored = scoreDirectResult(direct, philadelphia.lineup[0], 9, 9);
    expect(scored.runners.first).toBe(philadelphia.lineup[0].id);
    expect(scored.resolution.baseState).toBe("FIRST");
    const continued = startNextPlateAppearance(scored, true);
    expect(continued.runners).toEqual({});
    expect(continued.resolution).toMatchObject({ phase: "PITCH", baseState: "EMPTY" });
  });

  it("scores a bases-empty home run in the current inning", () => {
    const direct = { ...createInitialGame(park.id), resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const, terminalOutcome: "HOME_RUN" as const } };
    const scored = scoreDirectResult(direct, philadelphia.lineup[2], 9, 9);
    expect(scored.away).toMatchObject({ innings: [1], runs: 1, hits: 1, errors: 0 });
    expect(scored.runners).toEqual({});
  });

  it("charges a bases-empty error to the fielding team", () => {
    const direct = { ...createInitialGame(park.id), resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const, terminalOutcome: "ERROR" as const } };
    const scored = scoreDirectResult(direct, philadelphia.lineup[0], 9, 9);
    expect(scored.home.errors).toBe(1);
    expect(scored.away.hits).toBe(0);
    expect(scored.runners.first).toBe(philadelphia.lineup[0].id);
  });

  it("honors printed extra-base and hit credits on the bases-empty error charts", () => {
    const singleAndError = {
      ...createInitialGame(park.id),
      resolution: resolveBasesEmptyError("HIT_ERROR", 1),
    };
    const scoredSingle = scoreDirectResult(singleAndError, philadelphia.lineup[0], 9, 9);
    expect(scoredSingle.runners.second).toBe(philadelphia.lineup[0].id);
    expect(scoredSingle.away.hits).toBe(1);
    expect(scoredSingle.home.errors).toBe(1);

    const threeBaseError = {
      ...createInitialGame(park.id),
      resolution: resolveBasesEmptyError("HIT_ERROR", 6),
    };
    const scoredError = scoreDirectResult(threeBaseError, philadelphia.lineup[0], 9, 9);
    expect(scoredError.runners.third).toBe(philadelphia.lineup[0].id);
    expect(scoredError.away.hits).toBe(0);
    expect(scoredError.home.errors).toBe(1);
  });

  it("scores Probable Hit error result 5 as a single and E9 for a non-Superior RF", () => {
    const errorResult = resolveBasesEmptyError("HIT_ERROR", 5, false, "RF");
    expect(errorResult).toMatchObject({
      phase: "DIRECT_RESULT",
      terminalOutcome: "ERROR",
      awardedBase: "SECOND",
      creditedHit: true,
      errorChartRoll: 5,
      errorFielderPosition: "RF",
      chartAdvancementLocked: true,
    });
    const scored = scoreDirectResult({ ...createInitialGame(park.id), resolution: errorResult }, philadelphia.lineup[1], 9, 9);
    expect(scored.runners.second).toBe(philadelphia.lineup[1].id);
    expect(scored.away.hits).toBe(1);
    expect(scored.home.errors).toBe(1);

    const chartState = {
      ...createInitialGame(park.id, 10752),
      half: "bottom" as const,
      resolution: { phase: "ERROR_CHART" as const, baseState: "EMPTY" as const, chartFamily: "HIT_ERROR" as const },
    };
    const resolved = rollResolution(chartState, kansasCity.lineup[0], philadelphia.starter, park, philadelphia);
    expect(resolved.lastRoll?.sherco).toBe(5);
    expect(resolved.resolution).toMatchObject({ phase: "DIRECT_RESULT", terminalOutcome: "ERROR", awardedBase: "SECOND", creditedHit: true });
  });

  it("replays Brett's Brien-rules PH 66 and error-chart 5 as a single plus E9", () => {
    const brett = kansasCity.lineup[2];
    const probableHit = {
      ...createInitialGame(park.id, 13328),
      half: "bottom" as const,
      outs: 2 as const,
      homeBatterIndex: 2,
      resolution: { phase: "BATTED_BALL_CHART" as const, baseState: "EMPTY" as const, chartFamily: "PROBABLE_HIT" as const },
    };
    const errorChart = rollResolution(probableHit, brett, philadelphia.starter, park, philadelphia);
    expect(errorChart.lastRoll?.sherco).toBe(66);
    expect(errorChart.resolution.phase).toBe("ERROR_CHART");

    const errorFive = rollResolution({ ...errorChart, seed: 10752 }, brett, philadelphia.starter, park, philadelphia);
    expect(errorFive.lastRoll?.sherco).toBe(5);
    expect(errorFive.resolution).toMatchObject({
      phase: "DIRECT_RESULT",
      terminalOutcome: "ERROR",
      awardedBase: "SECOND",
      creditedHit: true,
      chartAdvancementLocked: true,
    });

    const scored = scoreDirectResult(errorFive, brett, 9, 9);
    expect(scored.runners.second).toBe(brett.id);
    expect(scored.home.hits).toBe(1);
    expect(scored.away.errors).toBe(1);
  });

  it("uses Rule 19's extra die only when the error fielder is Superior", () => {
    expect(basesEmptyErrorFielder("HIT_ERROR", 5, philadelphia.lineup[1], kansasCity.starter)).toBe("RF");
    const pending = resolveBasesEmptyError("HIT_ERROR", 5, true, "RF");
    expect(pending).toMatchObject({ phase: "SUPERIOR_ERROR_CHECK", errorChartRoll: 5, errorFielderPosition: "RF" });

    const prevented = resolveBasesEmptySuperiorError(pending, 3);
    expect(prevented).toMatchObject({ phase: "DIRECT_RESULT", terminalOutcome: "SINGLE" });
    const cleanSingle = scoreDirectResult({ ...createInitialGame(park.id), resolution: prevented }, philadelphia.lineup[1], 9, 9);
    expect(cleanSingle.runners.first).toBe(philadelphia.lineup[1].id);
    expect(cleanSingle.away.hits).toBe(1);
    expect(cleanSingle.home.errors).toBe(0);

    expect(resolveBasesEmptySuperiorError(pending, 4)).toMatchObject({
      phase: "DIRECT_RESULT",
      terminalOutcome: "ERROR",
      awardedBase: "SECOND",
      creditedHit: true,
    });
  });

  it("changes sides after the third out and preserves the next visiting hitter", () => {
    const direct = { ...createInitialGame(park.id), outs: 2, awayBatterIndex: 8, resolution: { phase: "DIRECT_RESULT" as const, baseState: "EMPTY" as const, terminalOutcome: "STRIKEOUT" as const } };
    const scored = scoreDirectResult(direct, philadelphia.lineup[8], 9, 9);
    expect(scored).toMatchObject({ inning: 1, half: "bottom", outs: 0, awayBatterIndex: 0 });
    expect(scored.runners).toEqual({});
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

  it("uses ball-to-destination distance only for every runner", () => {
    const batterToFirst = runnerDistance({ row: 19, column: 8 }, "HOME", 8);
    const mcBrideToThird = runnerDistance({ row: 19, column: 8 }, "SECOND", 8);
    expect(batterToFirst).toMatchObject({ to: "FIRST", distance: 11, tone: "yellow", mustAdvance: true });
    expect(mcBrideToThird).toMatchObject({ to: "THIRD", distance: 16, tone: "green", safeBeforeThrow: true });

    const ballAfterThrow = { row: 10, column: 8 };
    expect(runnerDistance(ballAfterThrow, "FIRST", 9)).toMatchObject({ to: "SECOND", distance: 2, tone: "red", mustAdvance: false });
    expect(runnerDistance(ballAfterThrow, "THIRD", 9)).toMatchObject({ to: "HOME", distance: 7, tone: "red", mustAdvance: false });
  });

  it("preserves the red, yellow, and green SherCo distance bands", () => {
    expect([runnerDistanceTone(8), runnerDistanceTone(9), runnerDistanceTone(12), runnerDistanceTone(13)]).toEqual(["red", "yellow", "yellow", "green"]);
  });

  it("gives existing runners—but not the batter—a two-base head start with two outs", () => {
    expect(twoOutHitAndRunDestination("FIRST")).toBe("THIRD");
    expect(twoOutHitAndRunDestination("SECOND")).toBe("HOME");
    expect(twoOutHitAndRunDestination("THIRD")).toBe("HOME");
    expect(twoOutHitAndRunDestination("HOME", true)).toBe("FIRST");
  });

  it("lets the lead runner control every trailing extra-base decision", () => {
    const runners = { third: "mcbride", second: "schmidt" };
    expect(leadRunnerDecisions({ row: 12, column: 3 }, runners, 9).map(({ runnerId, distance, status }) => ({ runnerId, distance, status }))).toEqual([
      { runnerId: "mcbride", distance: 9, status: "HOLD" },
      { runnerId: "schmidt", distance: 9, status: "BLOCKED" },
    ]);
    expect(leadRunnerDecisions({ row: 12, column: 3 }, runners, 8).map(({ runnerId, distance, status }) => ({ runnerId, distance, status }))).toEqual([
      { runnerId: "mcbride", distance: 9, status: "GO" },
      { runnerId: "schmidt", distance: 9, status: "GO" },
    ]);
  });

  it("places the loaded-base two-out example before the first defensive throw", () => {
    expect(applyTwoOutPreThrowAdvance({ first: "schmidt", second: "mcbride", third: "rose" }, "luzinski")).toEqual({
      runners: { first: "luzinski", third: "schmidt" },
      scored: ["rose", "mcbride"],
    });
  });

  it("presents Brien with cut or throw-through choices when Schmidt tries home", () => {
    expect(homeThrowChoices({ first: "luzinski", third: "schmidt" })).toEqual([
      {
        choice: "CUT",
        label: "Cut throw — concede run; hold trailing runner at first",
        concededRun: "schmidt",
      },
      {
        choice: "THROW_HOME",
        label: "Throw home — play on lead runner; trailing runner takes second",
        runnerAtRisk: "schmidt",
        trailingAdvance: { runnerId: "luzinski", from: "FIRST", to: "SECOND" },
      },
    ]);
  });
});

describe("game-day pitching changes", () => {
  it("stores the selected pitcher by team and clears a temporary rate adjustment", () => {
    const state = { ...createInitialGame("test-park"), activePitcherRate: "X" as const };
    const changed = selectPitcher(state, "home", kansasCity.bullpen[0].id);
    expect(changed.activePitchers.home).toBe(kansasCity.bullpen[0].id);
    expect(changed.activePitcherRate).toBeUndefined();
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

  it("retraces a ground ball by its full beyond-fence depth", () => {
    const cells: Park["cells"] = Array.from({ length: 28 }, () => Array.from({ length: 28 }, () => "field"));
    for (const coordinate of [{ row: 14, column: 14 }, { row: 15, column: 15 }, { row: 16, column: 16 }]) {
      cells[28 - coordinate.row][28 - coordinate.column] = "beyondFence";
    }
    const park = { id: "ricochet", name: "Ricochet", team: "Test", location: "Test", dimensions: 28 as const, cells, fielders: [], sourceSheet: "Test" };
    expect(directPath({ row: 13, column: 13 }, { row: 16, column: 16 })).toEqual([
      { row: 14, column: 14 }, { row: 15, column: 15 }, { row: 16, column: 16 },
    ]);
    expect(resolveGroundBallRicochet(park, { row: 16, column: 16 })).toEqual({
      originalLandingAt: { row: 16, column: 16 },
      fenceAt: { row: 13, column: 13 },
      finalBallAt: { row: 11, column: 11 },
      depth: 3,
    });

    const attempt = createFieldingAttempt(
      philadelphia.lineup[0],
      park,
      [
        { position: "CF", name: "Center Fielder", at: { row: 11, column: 14 }, arm: 8, range: 5 },
        { position: "LF", name: "Left Fielder", at: { row: 2, column: 20 }, arm: 9, range: 4 },
      ],
      { row: 16, column: 16 },
      "ground",
    );
    expect(attempt).toMatchObject({
      fielderPosition: "CF",
      ballAt: { row: 11, column: 11 },
      fieldingDistance: 4,
      ricochet: { fenceAt: { row: 13, column: 13 }, depth: 3 },
    });
    expect(attempt.fieldingPath).toHaveLength(4);
  });

  it("applies the Pivot Rule to the 7-9 continuous 6-4-3 route", () => {
    expect(pivotRulePenalty(8, 7)).toBe(1);
    expect(pivotRulePenalty(8, 8)).toBe(0);
    const attempt = { arm: 8 as const, fieldingDistance: 1, ballAt: { row: 7, column: 9 } };
    const weakPivot = resolveContinuousPlay(attempt, 6, [
      { base: "SECOND", pivotArm: 7 },
      { base: "FIRST" },
    ]);
    expect(weakPivot).toMatchObject({
      rawAllowance: 8,
      allowance: 7,
      pivotPenalty: 1,
      totalRoute: 7,
      ballAt: { row: 8, column: 3 },
      legs: [
        { base: "SECOND", routeDistance: 2, result: "OUT" },
        { base: "FIRST", routeDistance: 7, result: "TIE" },
      ],
    });
    expect(resolveContinuousPlay(attempt, 9, [{ base: "SECOND", pivotArm: 7 }, { base: "FIRST" }]).legs[1].result).toBe("OUT");
    expect(resolveContinuousPlay(attempt, 6, [{ base: "SECOND", pivotArm: 8 }, { base: "FIRST" }]).legs[1].result).toBe("OUT");
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

  it("shows a dash until each club has begun batting in that inning", () => {
    const game = createInitialGame("test-park");
    expect(scoreboardInningValue(game.away, "away", 1, 1, "top")).toBe(0);
    expect(scoreboardInningValue(game.home, "home", 1, 1, "top")).toBe("–");
    expect(scoreboardInningValue(game.home, "home", 1, 1, "bottom")).toBe(0);
    expect(scoreboardInningValue(game.away, "away", 2, 1, "bottom")).toBe("–");
  });
});
