"use client";

import { Box, Button, Flex, Input, List, Text, ThemeIcon } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconChecks, IconTrophy } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "./fetcher";

const WHEEL_ITEM_LIMIT = 6;
const SPIN_DURATION_MS = 4000;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const WHEEL_COLORS = ["#20c997", "#4dabf7", "#ffd43b", "#ff8787", "#b197fc", "#63e6be"];
const VOTE_WEIGHTS = [
  { weight: 3, label: "Gold vote", color: "yellow" },
  { weight: 2, label: "Silver vote", color: "gray" },
  { weight: 1, label: "Bronze vote", color: "orange" },
];
const CONFETTI_COLORS = ["#20c997", "#4dabf7", "#ffd43b", "#ff8787", "#b197fc", "#f06595"];
const CONFETTI_PARTICLES = Array.from({ length: 84 }, (_, index) => ({
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: `${(index % 14) * 45}ms`,
  drift: `${((index * 47) % 42) - 21}vw`,
  rotation: `${((index * 83) % 1080) - 540}deg`,
  lift: `${22 + ((index * 29) % 16)}vh`,
  fall: `${48 + ((index * 31) % 28)}vh`,
  left: `${36 + ((index * 19) % 29)}%`,
  top: `${54 + ((index * 23) % 10)}%`,
  duration: `${2600 + ((index * 53) % 1500)}ms`,
}));

const mainList = [
  { name: "CS2", maxPlayers: 20 },
  { name: "Wreckwest", maxPlayers: 24 },
  { name: "Fall Guys", maxPlayers: 32 },
  { name: "Golf it", maxPlayers: 8 },
  { name: "Human Fall Flat", maxPlayers: 8 },
  { name: "Mount&Blade Warband", maxPlayers: 200 },
  { name: "J-Jump Arena", maxPlayers: 10 },
  { name: "Just Act Natural", maxPlayers: 8 },
  { name: "Barotrauma", maxPlayers: 16 },
  { name: "Valheim", maxPlayers: 10 },
  { name: "Witch It", maxPlayers: 16 },
  { name: "Slappyball", maxPlayers: 6 },
  { name: "Chivalry 2", maxPlayers: 64 },
  { name: "Murderous Pursuits", maxPlayers: 8 },
  { name: "Muck", maxPlayers: 8 },
  { name: "Blackwake", maxPlayers: 54 },
  { name: "Hand simulator", maxPlayers: 8 },
  { name: "Against All Odds", maxPlayers: 20 },
  { name: "The Floor Is Still Really Cheap Lava", maxPlayers: 8 },
  { name: "Age of Empires IV", maxPlayers: 8 },
  { name: "Diabotical  (Epic games)", maxPlayers: 16 },
  { name: "Depth", maxPlayers: 6 },
  { name: "Left 4 Dead 2", maxPlayers: 8 },
  { name: "Party Animals", maxPlayers: 8 },
  { name: "ShellShock Live", maxPlayers: 8 },
  { name: "Transformice", maxPlayers: 200 },
  { name: "Oh Deer", maxPlayers: 5 },
  { name: "Crab Game", maxPlayers: 40 },
  { name: "Team Fortress 2", maxPlayers: 32 },
  { name: "Spellsworn", maxPlayers: 8 },
  { name: "Viscera Cleanup Detail", maxPlayers: 32 },
  { name: "Brawlhalla", maxPlayers: 8 },
  { name: "Palia", maxPlayers: 25 },
  { name: "Meccha Chameleon", maxPlayers: 10 },
  { name: "Robot Roller-Derby Disco Dodgeball", maxPlayers: 16 },
  { name: "Sneak Out", maxPlayers: 6 },
  { name: "Super Animal Royale", maxPlayers: 64 },
  { name: "Supraball", maxPlayers: 10 },
  { name: "Slapshot: Rebound", maxPlayers: 6 },
  { name: "PROJECT: PLAYTIME", maxPlayers: 7 },
  { name: "Scribble It!", maxPlayers: 16 },
  { name: "King of Crabs", maxPlayers: 100 },
  { name: "Pummel Party", maxPlayers: 8 },
  { name: "Retrocycles", maxPlayers: 16 },
  { name: "Valorant", maxPlayers: 10 },
  { name: "GeoGuesser", maxPlayers: 10 },
  { name: "Gartic Phone", maxPlayers: 30 },
  { name: "Peak", maxPlayers: 24 },
];

function normalizeName(name) {
  return String(name ?? "").trim();
}

function toGameId(source, name) {
  return `${source}-${normalizeName(name).toLowerCase().replaceAll(/\s+/g, "-")}`;
}

function apiUrl(path) {
  if (!API_BASE_URL || typeof window === "undefined") return path;

  try {
    const configuredUrl = new URL(API_BASE_URL);
    if (configuredUrl.host !== window.location.host) return path;
  } catch {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function showVoteSuccess(name, weight) {
  showNotification({
    title: `Voted ${name}`,
    message: weight ? `${weight} point vote updated.` : "Your vote was updated.",
    withBorder: true,
  });
}

function isActiveVote(myVotes, name, weight) {
  return normalizeName(myVotes?.[weight]) === normalizeName(name);
}

async function handleVoteClick(name, weight, voteForGame) {
  const didVote = await voteForGame(name, weight);
  if (didVote) showVoteSuccess(name, weight);
}

function getWheelSegments(games) {
  const totalVotes = games.reduce((sum, game) => sum + game.votes, 0);
  let cursor = 0;

  return games.map((game, index) => {
    const start = cursor;
    const size = totalVotes > 0 ? game.votes / totalVotes : 0;
    const end = index === games.length - 1 ? 1 : start + size;
    cursor = end;

    return {
      ...game,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      start,
      end,
      midpoint: start + (end - start) / 2,
      size,
    };
  });
}

function getWheelLabelStyle(segment) {
  const angle = segment.midpoint * 360;
  const radians = (angle * Math.PI) / 180;
  const radius = Math.min(34, Math.max(18, 20 + segment.size * 34));
  const left = 50 + Math.sin(radians) * radius;
  const top = 50 - Math.cos(radians) * radius;

  return {
    left: `${Math.min(86, Math.max(14, left))}%`,
    top: `${Math.min(86, Math.max(14, top))}%`,
    "--label-scale": Math.min(1, Math.max(0.68, 0.6 + segment.size * 1.6)),
    "--label-width": `${Math.min(30, Math.max(12, 14 + segment.size * 40))}cqi`,
  };
}

function ConfettiBurst({ burstKey }) {
  if (!burstKey) return null;

  return (
    <div className="confetti-layer" aria-hidden="true" key={burstKey}>
      {CONFETTI_PARTICLES.map((particle, index) => (
        <span
          className="confetti-piece"
          key={`${burstKey}-${index}`}
          style={{
            "--confetti-color": particle.color,
            "--confetti-delay": particle.delay,
            "--confetti-drift": particle.drift,
            "--confetti-rotation": particle.rotation,
            "--confetti-lift": particle.lift,
            "--confetti-fall": particle.fall,
            "--confetti-left": particle.left,
            "--confetti-top": particle.top,
            "--confetti-duration": particle.duration,
          }}
        />
      ))}
    </div>
  );
}

function getVoteListColor(index) {
  if (index === 0) return "yellow";
  if (index < WHEEL_ITEM_LIMIT) return "green";
  return "blue";
}

function getPlayedRecord(playedData, name) {
  return playedData?.games?.[normalizeName(name)] ?? { count: 0, lastPlayedAt: undefined };
}

export default function Games() {
  const [customGames = []] = useLocalStorage({
    key: "your-games",
    defaultValue: [],
  });
  const [isAdmin, setIsAdmin] = useLocalStorage({
    key: "admin",
    defaultValue: "",
  });
  const [gameInput, setGameInput] = useState("");
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: "name",
    direction: "asc",
  });
  const animation = useRef();
  const wheel = useRef();
  const previousEndDegree = useRef(0);
  const lastObservedSpinAngle = useRef(null);
  const spinToken = useRef(0);

  const { data: results, mutate } = useSWR(apiUrl("/api/results"), fetcher, {
    refreshInterval: 1000,
  });
  const { data: playedData, mutate: mutatePlayed } = useSWR(apiUrl("/api/played"), fetcher, {
    refreshInterval: 5000,
  });

  const records = useMemo(() => {
    const customRecords = Array.isArray(customGames)
      ? customGames.map((game) => {
          const played = getPlayedRecord(playedData, game.name);
          return {
            ...game,
            id: toGameId("custom", game.name),
            playedCount: played.count,
            lastPlayedAt: played.lastPlayedAt,
          };
        })
      : [];
    const mainRecords = mainList.map((game) => {
      const played = getPlayedRecord(playedData, game.name);
      return {
        ...game,
        id: toGameId("main", game.name),
        playedCount: played.count,
        lastPlayedAt: played.lastPlayedAt,
      };
    });

    return [...customRecords, ...mainRecords].sort((a, b) => {
      const direction = sortStatus.direction === "asc" ? 1 : -1;

      if (sortStatus.columnAccessor === "maxPlayers") {
        const aPlayers = Number.isFinite(a.maxPlayers) ? a.maxPlayers : Number.POSITIVE_INFINITY;
        const bPlayers = Number.isFinite(b.maxPlayers) ? b.maxPlayers : Number.POSITIVE_INFINITY;
        return (aPlayers - bPlayers || a.name.localeCompare(b.name)) * direction;
      }

      if (sortStatus.columnAccessor === "playedCount") {
        return ((a.playedCount ?? 0) - (b.playedCount ?? 0) || a.name.localeCompare(b.name)) * direction;
      }

      return a.name.localeCompare(b.name) * direction;
    });
  }, [customGames, playedData, sortStatus]);

  const topGames = useMemo(
    () => (results?.votes ?? []).slice(0, WHEEL_ITEM_LIMIT),
    [results?.votes]
  );
  const wheelSegments = useMemo(() => getWheelSegments(topGames), [topGames]);
  const wheelGradient =
    wheelSegments.length > 0
      ? wheelSegments
          .map(
            (segment) =>
              `${segment.color} ${Math.round(segment.start * 10000) / 100}% ${Math.round(segment.end * 10000) / 100}%`
          )
          .join(", ")
      : "#ced4da 0% 100%";

  const spinWheel = (newEndDegree) => {
    if (!wheel.current) return;
    const currentSpinToken = spinToken.current + 1;
    spinToken.current = currentSpinToken;

    if (animation.current) animation.current.cancel();

    animation.current = wheel.current.animate(
      [
        { transform: `rotate(${previousEndDegree.current}deg)` },
        { transform: `rotate(${newEndDegree}deg)` },
      ],
      {
        duration: SPIN_DURATION_MS,
        direction: "normal",
        easing: "cubic-bezier(0.440, -0.205, 0.000, 1.130)",
        fill: "forwards",
        iterations: 1,
      }
    );

    animation.current.finished
      .then(() => {
        if (spinToken.current === currentSpinToken) {
          setWheelRotation(newEndDegree % 360);
          setConfettiBurstKey((key) => key + 1);
        }
      })
      .catch(() => {});

    previousEndDegree.current = newEndDegree;
  };

  const voteForGame = async (gameName, weight = 3) => {
    const name = normalizeName(gameName ?? gameInput);
    if (!name) {
      showNotification({
        title: "Game name required",
        message: "Enter a game name before adding a vote.",
        color: "red",
        withBorder: true,
      });
      return false;
    }

    const response = await fetch(apiUrl("/api/vote"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, weight }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Vote was not updated",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return false;
    }

    const voteResult = await response.json();
    if (!gameName) setGameInput("");
    await mutate((currentResults) => ({ ...currentResults, ...voteResult }), {
      revalidate: true,
    });
    return true;
  };

  const markPlayed = async (gameName) => {
    const name = normalizeName(gameName);
    if (!name) return;

    const response = await fetch(apiUrl("/api/played"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Played game was not saved",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextPlayedData = await response.json();
    await mutatePlayed(nextPlayedData, { revalidate: false });
    showNotification({
      title: "Marked as played",
      message: name,
      withBorder: true,
    });
  };

  const clearVotes = async () => {
    await fetch(apiUrl("/api/vote"), {
      method: "DELETE",
    });
    await mutate();
  };

  const sendWheel = async () => {
    const response = await fetch(apiUrl("/api/vote"), {
      method: "PUT",
    });
    const nextResults = await response.json();

    if (lastObservedSpinAngle.current === null && typeof nextResults.spinAngle === "number") {
      lastObservedSpinAngle.current = previousEndDegree.current;
    }

    await mutate((currentResults) => ({ ...currentResults, ...nextResults }), {
      revalidate: true,
    });
  };

  useEffect(() => {
    if (typeof results?.spinAngle !== "number") return;

    if (lastObservedSpinAngle.current === null) {
      lastObservedSpinAngle.current = results.spinAngle;
      previousEndDegree.current = results.spinAngle;
      setWheelRotation(results.spinAngle % 360);
      return;
    }

    if (lastObservedSpinAngle.current === results.spinAngle) return;

    lastObservedSpinAngle.current = results.spinAngle;
    spinWheel(results.spinAngle);
  }, [results?.spinAngle]);

  return (
    <div>
      <Flex className="games-layout">
        <div className="games-list-panel">
          <div className="custom-vote-form">
            <Text>Vote for custom game</Text>
            <Flex gap="xs">
              <Input
                aria-label="Custom game name"
                value={gameInput}
                onChange={(event) => setGameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") voteForGame();
                }}
              />
              <Button onClick={() => voteForGame()}>Add</Button>
              {isAdmin !== "1" && <Button onClick={() => setIsAdmin("1")}>Make admin</Button>}
              {isAdmin === "1" && (
                <Button color="red" onClick={clearVotes}>
                  Clear votes
                </Button>
              )}
            </Flex>
          </div>
          <DataTable
            withTableBorder
            borderRadius="sm"
            striped
            highlightOnHover
            idAccessor="id"
            records={records}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            columns={[
              { accessor: "name", sortable: true },
              {
                accessor: "maxPlayers",
                sortable: true,
                render: ({ maxPlayers }) => maxPlayers ?? "???",
              },
              {
                accessor: "playedCount",
                sortable: true,
                title: "Popularity",
                render: ({ playedCount }) => playedCount ?? 0,
              },
              {
                accessor: "actions",
                render: ({ name }) => (
                  <Box className="ranked-vote-actions">
                    {VOTE_WEIGHTS.map(({ weight, label, color }) => {
                      const active = isActiveVote(results?.myVotes, name, weight);

                      return (
                        <Button
                          aria-label={`${label} for ${name}`}
                          color={active ? "orange" : color}
                          key={weight}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleVoteClick(name, weight, voteForGame);
                          }}
                          size="xs"
                          title={`${weight} point ${label.toLowerCase()}`}
                          variant={active ? "filled" : "light"}
                        >
                          <IconTrophy size={16} />
                          {weight}
                        </Button>
                      );
                    })}
                    {isAdmin === "1" && (
                      <Button
                        aria-label={`Mark ${name} as played`}
                        color="teal"
                        onClick={(event) => {
                          event.stopPropagation();
                          markPlayed(name);
                        }}
                        size="xs"
                        title="Mark as played"
                        variant="light"
                      >
                        <IconChecks size={16} />
                        Played
                      </Button>
                    )}
                  </Box>
                ),
              },
            ]}
          />
        </div>
        <Flex className="results-panel" direction="column">
          <fieldset className="ui-wheel-of-fortune">
            <div
              aria-label="Weighted vote wheel"
              className="wheel-disc"
              ref={wheel}
              style={{ background: `conic-gradient(from 0deg, ${wheelGradient})` }}
            >
              {wheelSegments.map((segment, index) => {
                return (
                  <span
                    className="wheel-label"
                    key={`${normalizeName(segment.name).toLowerCase()}-${index}`}
                    style={{
                      ...getWheelLabelStyle(segment),
                      "--wheel-rotation": `${-wheelRotation}deg`,
                    }}
                  >
                    <span className="wheel-label-text">{segment.name}</span>
                  </span>
                );
              })}
            </div>
            <ConfettiBurst burstKey={confettiBurstKey} />
            {isAdmin === "1" && (
              <button type="button" onClick={sendWheel}>
                SPIN
              </button>
            )}
          </fieldset>
          <div className="top-votes">
            <Text>Top votes:</Text>
            <List className="top-votes-list" listStyleType="none" spacing="xs">
              {results?.votes?.map((vote, index) => (
                <List.Item
                  className={index < WHEEL_ITEM_LIMIT ? "top-vote top-vote-large" : "top-vote"}
                  icon={
                    <ThemeIcon color={getVoteListColor(index)} radius="xl" size={index < WHEEL_ITEM_LIMIT ? "lg" : "md"}>
                      {index + 1}
                    </ThemeIcon>
                  }
                  key={`${normalizeName(vote.name).toLowerCase()}-${index}`}
                >
                  <div className="top-vote-content">
                    <span className="top-vote-name">{vote.name}</span>
                    <span className="top-vote-score">{vote.votes}</span>
                    {isAdmin === "1" && (
                      <Button
                        aria-label={`Mark ${vote.name} as played`}
                        color="teal"
                        onClick={() => markPlayed(vote.name)}
                        size="xs"
                        variant="light"
                      >
                        <IconChecks size={16} />
                        Played
                      </Button>
                    )}
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
