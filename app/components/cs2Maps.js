export const CS2_MAPS = [
  { id: "de_ancient", name: "Ancient", type: "bomb", image: "/maps/cs2/de_ancient.svg" },
  { id: "de_anubis", name: "Anubis", type: "bomb", image: "/maps/cs2/de_anubis.svg" },
  { id: "de_dust2", name: "Dust II", type: "bomb", image: "/maps/cs2/de_dust2.svg" },
  { id: "de_inferno", name: "Inferno", type: "bomb", image: "/maps/cs2/de_inferno.svg" },
  { id: "de_mirage", name: "Mirage", type: "bomb", image: "/maps/cs2/de_mirage.svg" },
  { id: "de_nuke", name: "Nuke", type: "bomb", image: "/maps/cs2/de_nuke.svg" },
  { id: "de_overpass", name: "Overpass", type: "bomb", image: "/maps/cs2/de_overpass.svg" },
  { id: "cs_italy", name: "Italy", type: "hostage", image: "/maps/cs2/cs_italy.svg" },
  { id: "cs_office", name: "Office", type: "hostage", image: "/maps/cs2/cs_office.svg" },
];

export function getCs2MapById(mapId) {
  return CS2_MAPS.find((map) => map.id === mapId);
}

export function isKnownCs2MapId(mapId) {
  return CS2_MAPS.some((map) => map.id === mapId);
}
