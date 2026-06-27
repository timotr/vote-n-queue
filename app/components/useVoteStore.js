import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import fs from 'fs';

const STORE_FILE = 'vote-store.json';

function readStoreFile() {
  try {
    const file = fs.readFileSync(STORE_FILE, 'utf8');
    return file ? JSON.parse(file) : {};
  } catch (e) {
    return {};
  }
}

function replaceObjectContents(target, source) {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, source);
}

const json = readStoreFile();

const storage = {
  getItem: async (name) => {
    replaceObjectContents(json, readStoreFile());
    return json[name];
  },
  setItem: async (name, value) => {
    json[name] = value;
    fs.writeFileSync(STORE_FILE, JSON.stringify(json));
  },
  removeItem: async (name) => {
    delete json[name];
    fs.writeFileSync(STORE_FILE, JSON.stringify(json));
  },
}

const WHEEL_ITEM_LIMIT = 6;
const VALID_VOTE_WEIGHTS = [1, 2, 3];

function getSortedVotes(votes) {
  return Object.entries(votes ?? {})
    .map(([name = "", voteCount = 0]) => ({ name: String(name).trim(), votes: voteCount }))
    .filter(({ name, votes }) => name && votes > 0)
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

function getSpinResult(votes, previousSpinAngle) {
  const candidates = getSortedVotes(votes).slice(0, WHEEL_ITEM_LIMIT);
  const totalVotes = candidates.reduce((sum, game) => sum + game.votes, 0);
  if (!totalVotes) {
    return { spinAngle: 0, nextGame: "" };
  }

  const target = Math.random() * totalVotes;
  let cumulativeVotes = 0;
  let cumulativeShare = 0;

  for (const game of candidates) {
    const previousShare = cumulativeShare;
    cumulativeVotes += game.votes;
    cumulativeShare = cumulativeVotes / totalVotes;

    if (target < cumulativeVotes) {
      const midpoint = previousShare + (cumulativeShare - previousShare) / 2;
      const sliceMidpointDegrees = midpoint * 360;
      const pointerRotation = (360 - sliceMidpointDegrees) % 360;
      const baseSpinAngle = previousSpinAngle + 1800;
      const extraRotation = (pointerRotation - (baseSpinAngle % 360) + 360) % 360;

      return {
        spinAngle: baseSpinAngle + extraRotation,
        nextGame: game.name,
      };
    }
  }

  const fallback = candidates[candidates.length - 1];
  return {
    spinAngle: previousSpinAngle + 1800,
    nextGame: fallback.name,
  };
}

function updateVoteTotal(votes, gameName, delta) {
  if (!gameName || !delta) return votes;

  const nextVotes = { ...votes };
  const nextTotal = (nextVotes[gameName] || 0) + delta;

  if (nextTotal > 0) {
    nextVotes[gameName] = nextTotal;
  } else {
    delete nextVotes[gameName];
  }

  return nextVotes;
}

export const useVoteStore = create(
  persist(
    (set) => ({
      votes: {},
      individualVotes: {},
      rankedVotesByClient: {},
      nextGame: "",
      setRankedVote: (gameName, clientId, weight) => {
        const normalizedGameName = String(gameName ?? "").trim();
        const normalizedClientId = String(clientId ?? "unknown").trim() || "unknown";
        const normalizedWeight = Number(weight);
        let nextClientVotes = {};

        if (!normalizedGameName || !VALID_VOTE_WEIGHTS.includes(normalizedWeight)) {
          return nextClientVotes;
        }

        set((state) => {
          const currentClientVotes = state.rankedVotesByClient?.[normalizedClientId] ?? {};
          nextClientVotes = { ...currentClientVotes };
          let nextVotes = state.votes ?? {};
          const previousGameName = currentClientVotes[normalizedWeight];

          if (previousGameName) {
            nextVotes = updateVoteTotal(nextVotes, previousGameName, -normalizedWeight);
          }

          if (previousGameName === normalizedGameName) {
            delete nextClientVotes[normalizedWeight];
          } else {
            nextVotes = updateVoteTotal(nextVotes, normalizedGameName, normalizedWeight);
            nextClientVotes[normalizedWeight] = normalizedGameName;
          }

          return {
            votes: nextVotes,
            rankedVotesByClient: {
              ...state.rankedVotesByClient,
              [normalizedClientId]: nextClientVotes,
            },
          };
        });

        return nextClientVotes;
      },
      resetVote: (gameName) => set((state) => {
        const votes = { ...state.votes };
        delete votes[gameName];
        return { votes };
      }),
      resetVotes: () => set({ votes: {}, individualVotes: {}, rankedVotesByClient: {}, nextGame: "" }),
      spinAngle: 0,
      setSpinAngle: () => {
        let result = { spinAngle: 0, nextGame: "" };
        set((state) => {
          result = getSpinResult(state.votes, state.spinAngle);
          return { ...state, ...result };
        });
        return result;
      },
    }),
    {
      name: 'vote-storage', // name of the item in the storage (must be unique)
      storage
      //storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    },
  ),
)

export function syncVoteStoreFromFile() {
  const persistedState = readStoreFile()?.['vote-storage']?.state;

  if (!persistedState) return;

  useVoteStore.setState({
    votes: persistedState.votes ?? {},
    individualVotes: persistedState.individualVotes ?? {},
    rankedVotesByClient: persistedState.rankedVotesByClient ?? {},
    nextGame: persistedState.nextGame ?? "",
    spinAngle: persistedState.spinAngle ?? 0,
  });
}
