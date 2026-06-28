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

function normalizeVoteName(name) {
  return String(name ?? "").trim();
}

function isSameVoteName(firstName, secondName) {
  return normalizeVoteName(firstName).toLowerCase() === normalizeVoteName(secondName).toLowerCase();
}

function getSortedVotes(votes) {
  return Object.entries(votes ?? {})
    .map(([name = "", voteCount = 0]) => ({ name: String(name).trim(), votes: voteCount }))
    .filter(({ name, votes }) => name && votes > 0)
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

function getRandomSegmentLandingPoint(startShare, endShare) {
  const segmentSize = endShare - startShare;
  if (segmentSize <= 0) return startShare;

  const edgePadding = Math.min(segmentSize * 0.3, 8 / 360);
  const safeStart = startShare + edgePadding;
  const safeEnd = endShare - edgePadding;

  if (safeEnd <= safeStart) {
    return startShare + segmentSize / 2;
  }

  return safeStart + Math.random() * (safeEnd - safeStart);
}

function getRandomFullTurns() {
  return 5 + Math.floor(Math.random() * 3);
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
      const landingPoint = getRandomSegmentLandingPoint(previousShare, cumulativeShare);
      const landingDegrees = landingPoint * 360;
      const pointerRotation = (360 - landingDegrees) % 360;
      const baseSpinAngle = previousSpinAngle + getRandomFullTurns() * 360;
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
      setRankedVote: (gameName, clientId, weight, options = {}) => {
        const normalizedGameName = normalizeVoteName(gameName);
        const normalizedClientId = String(clientId ?? "unknown").trim() || "unknown";
        const normalizedWeight = Number(weight);
        const allowSameGameRankedVotes = options.allowSameGameRankedVotes === true;
        let nextClientVotes = {};

        if (!normalizedGameName || !VALID_VOTE_WEIGHTS.includes(normalizedWeight)) {
          return nextClientVotes;
        }

        set((state) => {
          const currentClientVotes = state.rankedVotesByClient?.[normalizedClientId] ?? {};
          nextClientVotes = { ...currentClientVotes };
          let nextVotes = state.votes ?? {};
          const previousGameName = currentClientVotes[normalizedWeight];

          if (isSameVoteName(previousGameName, normalizedGameName)) {
            nextVotes = updateVoteTotal(nextVotes, previousGameName, -normalizedWeight);
            delete nextClientVotes[normalizedWeight];

            return {
              votes: nextVotes,
              rankedVotesByClient: {
                ...state.rankedVotesByClient,
                [normalizedClientId]: nextClientVotes,
              },
            };
          }

          if (previousGameName) {
            nextVotes = updateVoteTotal(nextVotes, previousGameName, -normalizedWeight);
            delete nextClientVotes[normalizedWeight];
          }

          if (!allowSameGameRankedVotes) {
            Object.entries(currentClientVotes).forEach(([rank, rankedGameName]) => {
              const rankedWeight = Number(rank);
              if (rankedWeight !== normalizedWeight && isSameVoteName(rankedGameName, normalizedGameName)) {
                nextVotes = updateVoteTotal(nextVotes, rankedGameName, -rankedWeight);
                delete nextClientVotes[rank];
              }
            });
          }

          nextVotes = updateVoteTotal(nextVotes, normalizedGameName, normalizedWeight);
          nextClientVotes[normalizedWeight] = normalizedGameName;

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
      renameGame: (oldName, newName) => {
        const normalizedOldName = normalizeVoteName(oldName);
        const normalizedNewName = normalizeVoteName(newName);

        if (!normalizedOldName || !normalizedNewName || isSameVoteName(normalizedOldName, normalizedNewName)) {
          return;
        }

        set((state) => {
          const votes = { ...(state.votes ?? {}) };
          const oldVoteEntry = Object.keys(votes).find((name) => isSameVoteName(name, normalizedOldName));

          if (oldVoteEntry) {
            votes[normalizedNewName] = (votes[normalizedNewName] ?? 0) + votes[oldVoteEntry];
            delete votes[oldVoteEntry];
          }

          const rankedVotesByClient = Object.fromEntries(
            Object.entries(state.rankedVotesByClient ?? {}).map(([clientId, clientVotes]) => [
              clientId,
              Object.fromEntries(
                Object.entries(clientVotes ?? {}).map(([rank, gameName]) => [
                  rank,
                  isSameVoteName(gameName, normalizedOldName) ? normalizedNewName : gameName,
                ])
              ),
            ])
          );

          const individualVotes = Object.fromEntries(
            Object.entries(state.individualVotes ?? {}).map(([clientId, gameName]) => [
              clientId,
              isSameVoteName(gameName, normalizedOldName) ? normalizedNewName : gameName,
            ])
          );

          return {
            votes,
            individualVotes,
            rankedVotesByClient,
            nextGame: isSameVoteName(state.nextGame, normalizedOldName) ? normalizedNewName : state.nextGame,
          };
        });
      },
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
