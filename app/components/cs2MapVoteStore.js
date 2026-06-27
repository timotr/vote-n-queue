import fs from "fs";
import { getCs2MapById, isKnownCs2MapId } from "./cs2Maps";

const STORE_FILE = "cs2-map-vote-store.json";
const WHEEL_ITEM_LIMIT = 6;

function createEmptyStore() {
  return {
    votes: {},
    votesByClient: {},
    spinAngle: 0,
    nextMap: "",
  };
}

function readStore() {
  try {
    const file = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = file ? JSON.parse(file) : createEmptyStore();

    return {
      votes: parsed.votes ?? {},
      votesByClient: parsed.votesByClient ?? {},
      spinAngle: Number(parsed.spinAngle) || 0,
      nextMap: String(parsed.nextMap ?? ""),
    };
  } catch {
    return createEmptyStore();
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store));
}

function updateVoteTotal(votes, mapId, delta) {
  if (!isKnownCs2MapId(mapId) || !delta) return votes;

  const nextVotes = { ...votes };
  const nextTotal = (nextVotes[mapId] || 0) + delta;

  if (nextTotal > 0) {
    nextVotes[mapId] = nextTotal;
  } else {
    delete nextVotes[mapId];
  }

  return nextVotes;
}

function getSortedVotes(votes) {
  return Object.entries(votes ?? {})
    .map(([mapId, voteCount]) => {
      const map = getCs2MapById(mapId);
      return map ? { mapId, name: map.name, votes: Number(voteCount) || 0 } : undefined;
    })
    .filter((vote) => vote && vote.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

function getSpinResult(votes, previousSpinAngle) {
  const candidates = getSortedVotes(votes).slice(0, WHEEL_ITEM_LIMIT);
  const totalVotes = candidates.reduce((sum, map) => sum + map.votes, 0);
  if (!totalVotes) {
    return { spinAngle: 0, nextMap: "" };
  }

  const target = Math.random() * totalVotes;
  let cumulativeVotes = 0;
  let cumulativeShare = 0;

  for (const map of candidates) {
    const previousShare = cumulativeShare;
    cumulativeVotes += map.votes;
    cumulativeShare = cumulativeVotes / totalVotes;

    if (target < cumulativeVotes) {
      const midpoint = previousShare + (cumulativeShare - previousShare) / 2;
      const sliceMidpointDegrees = midpoint * 360;
      const pointerRotation = (360 - sliceMidpointDegrees) % 360;
      const baseSpinAngle = previousSpinAngle + 1800;
      const extraRotation = (pointerRotation - (baseSpinAngle % 360) + 360) % 360;

      return {
        spinAngle: baseSpinAngle + extraRotation,
        nextMap: map.name,
      };
    }
  }

  const fallback = candidates[candidates.length - 1];
  return {
    spinAngle: previousSpinAngle + 1800,
    nextMap: fallback.name,
  };
}

export function getCs2MapResults(clientId) {
  const store = readStore();

  return {
    votes: getSortedVotes(store.votes),
    myVote: store.votesByClient?.[clientId] ?? "",
    spinAngle: store.spinAngle,
    nextMap: store.nextMap,
  };
}

export function setCs2MapVote(mapId, clientId) {
  const normalizedMapId = String(mapId ?? "").trim();
  const normalizedClientId = String(clientId ?? "unknown").trim() || "unknown";
  if (!isKnownCs2MapId(normalizedMapId)) return undefined;

  const store = readStore();
  const previousMapId = store.votesByClient[normalizedClientId];
  if (previousMapId === normalizedMapId) {
    return getCs2MapResults(normalizedClientId);
  }

  let nextVotes = store.votes;
  if (previousMapId) nextVotes = updateVoteTotal(nextVotes, previousMapId, -1);
  nextVotes = updateVoteTotal(nextVotes, normalizedMapId, 1);

  writeStore({
    ...store,
    votes: nextVotes,
    votesByClient: {
      ...store.votesByClient,
      [normalizedClientId]: normalizedMapId,
    },
  });

  return getCs2MapResults(normalizedClientId);
}

export function spinCs2MapWheel() {
  const store = readStore();
  const result = getSpinResult(store.votes, store.spinAngle);
  writeStore({ ...store, ...result });
  return result;
}

export function resetCs2MapVotes() {
  writeStore(createEmptyStore());
}
