/**
    Fuzzy subsequence search
    - Returns null if query is not a subsequence of target
    - Otherwise returns { score, positions } where positions is array of indices in target
    - Higher score = better match
*/

interface Options {
  caseSensitive?: boolean; // default: true
  // scoring weights (positive numbers)
  gapPenalty?: number; // penalty per gap length (default: 1.0)
  startPenalty?: number; // penalty proportional to start index (default: 0.1)
  consecutiveBonus?: number; // bonus per extra consecutive character (default: 1.0)
}

interface MatchResult {
  score: number;
  positions: number[]; // indices in target for each char of query
}

export function fuzzySubsequence(
  query: string,
  target: string,
  options: Options = {},
): MatchResult | null {
  const {
    caseSensitive = true,
    gapPenalty = 1.0,
    startPenalty = 0.1,
    consecutiveBonus = 1.0,
  } = options;

  if (!caseSensitive) {
    query = query.toLowerCase();
    target = target.toLowerCase();
  }

  const qLen = query.length;
  const tLen = target.length;

  if (qLen === 0) {
    return { score: 0, positions: [] };
  }
  if (qLen > tLen) return null;

  // Dynamic programming approach:
  // For each character position in target, maintain best match state for matching
  // prefix query[0..i]. We'll track:
  //  - score for matching up to query char i ending at target position j
  //  - predecessor target index to reconstruct positions
  //
  // We'll keep arrays for current and previous row of length tLen.
  // Complexity O(qLen * tLen).

  // Initialize arrays
  const prevScore = new Array<number>(tLen).fill(-Infinity);
  const prevPrevIndex = new Array<number>(tLen).fill(-1); // predecessor index for prev row

  // For the first query character, any matching target position j can start a match
  for (let j = 0; j < tLen; j++) {
    if (target[j] === query[0]) {
      // base score: penalize start index (earlier start better)
      const score = -startPenalty * j;
      prevScore[j] = score;
      prevPrevIndex[j] = -1; // no predecessor
    }
  }

  // If query has length 1, pick best score among prevScore
  if (qLen === 1) {
    let bestScore = -Infinity;
    let bestIdx = -1;
    for (let j = 0; j < tLen; j++) {
      const score = prevScore[j];
      if (score !== undefined && score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }
    if (bestIdx === -1) return null;
    return { score: bestScore, positions: [bestIdx] };
  }

  // For subsequent characters, build DP rows
  // We'll keep for each cell:
  //  - best score ending at target position j matching query[0..i]
  //  - predecessor index in target for previous char match
  const curScore = new Array<number>(tLen).fill(-Infinity);
  const curPrevIndex = new Array<number>(tLen).fill(-1);

  for (let qi = 1; qi < qLen; qi++) {
    const qc = query[qi];
    // reset current row
    for (let j = 0; j < tLen; j++) {
      curScore[j] = -Infinity;
      curPrevIndex[j] = -1;
    }

    // For each target position j where target[j] === qc, consider transitions from any k < j
    // Optimize by scanning k from 0..j-1 and tracking best transition so far.
    for (let j = 0; j < tLen; j++) {
      if (target[j] !== qc) continue;

      let bestTransitionScore = -Infinity;
      let bestK = -1;

      // Scan previous positions k < j
      for (let k = 0; k < j; k++) {
        const prev = prevScore[k];
        if (prev === undefined || prev === -Infinity) continue;

        // gap length between matched characters
        const gapLen = j - k - 1;

        // base transition score: previous score minus gap penalty times gap length
        let s = prev - gapPenalty * gapLen;

        // add consecutive bonus if characters are adjacent (gapLen === 0)
        if (gapLen === 0) {
          s += consecutiveBonus;
        }

        if (s > bestTransitionScore) {
          bestTransitionScore = s;
          bestK = k;
        }
      }

      // If no predecessor found, but qc might start a new match only if qi==0 (handled earlier).
      // So require bestK !== -1
      if (bestK !== -1) {
        curScore[j] = bestTransitionScore;
        curPrevIndex[j] = bestK;
      }
    }

    // move cur -> prev for next iteration
    for (let j = 0; j < tLen; j++) {
      const curScoreValue = curScore[j];
      const curPrevIndexValue = curPrevIndex[j];
      if (curScoreValue !== undefined) {
        prevScore[j] = curScoreValue;
      }
      if (curPrevIndexValue !== undefined) {
        prevPrevIndex[j] = curPrevIndexValue;
      }
    }
  }

  // After finishing, choose best ending position
  let bestScore = -Infinity;
  let bestEnd = -1;
  for (let j = 0; j < tLen; j++) {
    const score = prevScore[j];
    if (score !== undefined && score > bestScore) {
      bestScore = score;
      bestEnd = j;
    }
  }
  if (bestEnd === -1) return null;

  // Reconstruct positions by walking prevPrevIndex chain.
  const positions = new Array<number>(qLen);
  let idx = bestEnd;
  for (let qi = qLen - 1; qi >= 0; qi--) {
    positions[qi] = idx;
    const prevIdx = prevPrevIndex[idx];
    idx = qi === 0 ? -1 : (prevIdx ?? -1);
  }

  return { score: bestScore, positions };
}
