import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import fs from 'fs';

let file = "{}"
try {
  file = fs.readFileSync('vote-store.json');
} catch (e) {
}
const json = file ? JSON.parse(file) : {};

const storage = {
  getItem: async (name) => {
    return json[name];
  },
  setItem: async (name, value) => {
    json[name] = value;
    fs.writeFileSync('vote-store.json', JSON.stringify(json));
  },
  removeItem: async (name) => {
    delete json[name];
    fs.writeFileSync('vote-store.json', JSON.stringify(json));
  },
}

export const useVoteStore = create(
  persist(
    (set, get) => ({
      votes: {},
      individualVotes: {},
      addVote: (gameName, ip) => set((state) => {
        let uniqueGame = ip+"-"+gameName;
        if (state.individualVotes[uniqueGame]) return state;
        return {
          votes: {
            ...state.votes,
            [gameName]: (state.votes[gameName] || 0) + 1
          },
          individualVotes: {
            ...state.individualVotes,
            [uniqueGame]: 1
          }
        }
      }),
      resetVote: (gameName) => set((state) => {
        delete state.votes[gameName];
        return state.votes;
      }),
      resetVotes: () => set({ votes: {}, individualVotes: {} }),
      spinAngle: 0,
      setSpinAngle: () => set((state) => ({ ...state, spinAngle: (Math.random() * 360 + 1800) })),
    }),
    {
      name: 'vote-storage', // name of the item in the storage (must be unique)
      storage
      //storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    },
  ),
)