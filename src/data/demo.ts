import type { Batter, Pitcher, Team } from "../core/types";

const batter = (
  id: string,
  name: string,
  bats: Batter["bats"],
  offensiveGrade: Batter["offensiveGrade"],
  speed: Batter["speed"],
  position: Batter["position"],
  average: number,
  ops: number,
  homeRun?: number,
  triple?: number,
  clutch = false,
  homeRuns = 0,
  runsBattedIn = 0,
  defense: Batter["defense"] = { arm: 8, range: 4 },
): Batter => ({ id, name, bats, offensiveGrade, speed, position, average, ops, homeRun, triple, clutch, homeRuns, runsBattedIn, defense });

const pitcher = (
  id: string,
  name: string,
  throws: Pitcher["throws"],
  rate: Pitcher["rate"],
  effectivenessInnings: number,
  fatiguedRate: Pitcher["fatiguedRate"],
  walkStrikeout: string,
  role: Pitcher["role"],
  era: number,
  ratingPrefix?: Pitcher["ratingPrefix"],
  defense: Pitcher["defense"] = { arm: 9, range: 4 },
): Pitcher => ({ id, name, throws, rate, effectivenessInnings, fatiguedRate, walkStrikeout, role, era, ratingPrefix, defense });

export const philadelphia: Team = {
  id: "1980-phi",
  city: "Philadelphia",
  nickname: "Phillies",
  abbreviation: "PHI",
  lineup: [
    batter("phi-rose", "Pete Rose", "S", "B", "REGULAR", "1B", .282, .706, undefined, undefined, false, 0, 14, { arm: 9, range: 5, superior: true }),
    batter("phi-mcbride", "Bake McBride", "L", "A", "REGULAR", "RF", .309, .801, 11, 12, true, 11, 56, { arm: 8, range: 5 }),
    batter("phi-schmidt", "Mike Schmidt", "R", "B", "REGULAR", "3B", .286, 1.004, 16, 22, true, 48, 119, { arm: 9, range: 4 }),
    batter("phi-luzinski", "Greg Luzinski", "R", "C", "REGULAR", "LF", .228, .811, 14, undefined, false, 0, 0, { arm: 8, range: 4, superior: true }),
    batter("phi-maddox", "Garry Maddox", "R", "B", "*", "CF", .259, .683, 11, undefined, false, 0, 0, { arm: 8, range: 5 }),
    batter("phi-trillo", "Manny Trillo", "R", "B", "REGULAR", "2B", .292, .721, 11, 12, false, 0, 0, { arm: 9, range: 5, superior: true }),
    batter("phi-boone", "Bob Boone", "R", "C", "REGULAR", "C", .229, .605, 11, undefined, false, 0, 0, { arm: 9, range: 5 }),
    batter("phi-bowa", "Larry Bowa", "S", "B", "*", "SS", .267, .633, undefined, undefined, false, 0, 0, { arm: 9, range: 4, superior: true }),
    batter("phi-carlton-bat", "Steve Carlton", "L", "D", "REGULAR", "P", .218, .490, undefined, undefined, false, 0, 0, { arm: 9, range: 4, superior: true }),
  ],
  starter: pitcher("phi-carlton", "Steve Carlton", "L", "L", 8, "M", "11–16", "SP", 2.34, undefined, { arm: 9, range: 4, superior: true }),
  bullpen: [
    pitcher("phi-mcgraw", "Tug McGraw", "L", "J", 2, "Z", "11–15", "RP", 1.46, "−"),
    pitcher("phi-reed", "Ron Reed", "R", "X", 2, "Z", "11–14", "RP", 4.04, "−"),
    pitcher("phi-noles", "Dickie Noles", "R", "M", 2, "Z", "12–15", "RP", 3.89),
    pitcher("phi-saucier", "Kevin Saucier", "L", "M", 2, "Z", "11–13", "RP", 3.42, "−"),
  ],
};

export const kansasCity: Team = {
  id: "1980-kc",
  city: "Kansas City",
  nickname: "Royals",
  abbreviation: "KC",
  lineup: [
    batter("kc-wilson", "Willie Wilson", "S", "A", "**", "CF", .326, .731, undefined, 11, false, 0, 0, { arm: 9, range: 5 }),
    batter("kc-white", "Frank White", "R", "B", "*", "2B", .264, .658, 11, undefined, false, 0, 0, { arm: 9, range: 5, superior: true }),
    batter("kc-brett", "George Brett", "L", "AA", "REGULAR", "3B", .390, 1.118, 12, 13, true, 0, 0, { arm: 9, range: 5 }),
    batter("kc-aikens", "Willie Aikens", "L", "B", "REGULAR", "1B", .278, .817, 12, undefined, true, 0, 0, { arm: 8, range: 4 }),
    batter("kc-mcrae", "Hal McRae", "R", "B", "REGULAR", "DH", .297, .817, 12, undefined, true),
    batter("kc-otis", "Amos Otis", "R", "B", "*", "RF", .251, .747, 12, undefined, false, 0, 0, { arm: 9, range: 5 }),
    batter("kc-porter", "Darrell Porter", "L", "C", "REGULAR", "C", .249, .696, 11, undefined, false, 0, 0, { arm: 9, range: 4 }),
    batter("kc-hurdle", "Clint Hurdle", "L", "B", "REGULAR", "LF", .294, .807, 11, undefined, false, 0, 0, { arm: 9, range: 4 }),
    batter("kc-washington", "U L Washington", "S", "B", "*", "SS", .273, .668, undefined, 11, false, 0, 0, { arm: 9, range: 5 }),
  ],
  starter: pitcher("kc-leonard", "Dennis Leonard", "R", "M", 8, "X", "11–14", "SP", 3.79, "+"),
  bullpen: [
    pitcher("kc-quisenberry", "Dan Quisenberry", "R", "M", 2, "Z", "n–11", "RP", 3.09, "−"),
    pitcher("kc-pattin", "Marty Pattin", "R", "M", 3, "Z", "11–13", "RP", 3.64),
    pitcher("kc-martin", "Renie Martin", "R", "X", 5, "Z", "12–14", "RP", 4.39, "+"),
    pitcher("kc-brett-p", "Ken Brett", "L", "J", 2, "Z", "12–14", "RP", 3.10, "−"),
  ],
};

export const demoGame = { away: philadelphia, home: kansasCity };
