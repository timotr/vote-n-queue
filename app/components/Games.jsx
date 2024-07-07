"use client";

import {
  Flex,
  rem,
  Box,
  Text,
  Button,
  Input,
  List,
  Badge,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetcher } from "./fetcher";
import useSWR from "swr";

const mainList = [
  { name: "CS2" },
  { name: "Wreckwest" },
  { name: "Fall Guys" },
  { name: "Golf it" },
  { name: "Human Fall Flat" },
  { name: "Mount&Blade Warband" },
  { name: "J-Jump Arena" },
  { name: "Just Act Natural" },
  { name: "Barotrauma" },
  { name: "Valheim" },
  { name: "Witch It" },
  { name: "Slappyball" },
  { name: "Chivalry 2" },
  { name: "Murderous Pursuits" },
  { name: "Muck" },
  { name: "Blackwake" },
  { name: "Hand simulator" },
  { name: "Against All Odds" },
  { name: "The Floor Is Still Really Cheap Lava" },
  { name: "Age of Empires IV" },
  { name: "Diabotical  ( Epic games)" },
  { name: "Depth" },
  { name: "Left 4 Dead 2" },
  { name: "Party Animals" },
  { name: "ShellShock Live" },
  { name: "Transformice" },
  { name: "Oh Deer" },
  { name: "Crab Game" },
  { name: "Team Fortress 2" },
  { name: "Spellsworn" },
  { name: "Viscera Cleanup Detail" },
  { name: "Brawlhalla" },
  { name: "Palia" },
  { name: "Robot Roller-Derby Disco Dodgeball" },
  { name: "Sneak Out" },
  { name: "Super Animal Royale" },
  { name: "Supraball" },
  { name: "Slapshot: Rebound" },
  { name: "PROJECT: PLAYTIME" },
  { name: "Scribble It!" },
  { name: "King of Crabs" },
  { name: "Pummel Party" },
  { name: "Retrocycles" },
  { name: "Valorant" },
  { name: "GeoGuesser" },
];

const API = "http://192.168.3.114:3000";

export default function Games() {
  const [customGames, setCustomGames] = useLocalStorage("your-games", []);
  const [isAdmin, setIsAdmin] = useLocalStorage("admin", "");
  const [gameInput, setGameInput] = useState("");
  const iconStyle = { width: rem(12), height: rem(12) };

  const records = useMemo(() => {
    console.log(customGames, typeof customGames);
    mainList.sort((a, b) => a?.name?.localeCompare(b?.name));
    if (!customGames) {
      return mainList;
    }
    return [...customGames, ...mainList];
  }, [customGames]);

  const animation = useRef();
  const wheel = useRef();
  let previousEndDegree = 0;

  const { data: results } = useSWR(API + "/api/results", fetcher, {
    refreshInterval: 1000,
  });

  const spinWheel = (newEndDegree) => {
    if (animation.current) {
      animation.current.cancel(); // Reset the animation if it already exists
    }

    //const randomAdditionalDegrees = Math.random() * 360 + 1800;
    //const newEndDegree = previousEndDegree + randomAdditionalDegrees;

    animation.current = wheel.current.animate(
      [
        { transform: `rotate(${previousEndDegree}deg)` },
        { transform: `rotate(${newEndDegree}deg)` },
      ],
      {
        duration: 4000,
        direction: "normal",
        easing: "cubic-bezier(0.440, -0.205, 0.000, 1.130)",
        fill: "forwards",
        iterations: 1,
      }
    );

    previousEndDegree = newEndDegree;
  };

  const voteForGame = async (gameName) => {
    await fetch(API + "/api/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: gameName ?? gameInput }),
    });
  };

  const removeGame = async () => {
    await fetch(API + "/api/vote", {
      method: "DELETE",
    });
  };

  const clearVotes = async () => {
    await fetch(API + "/api/vote", {
      method: "DELETE",
    });
  };

  const sendWheel = async () => {
    await fetch(API + "/api/vote", {
      method: "PUT",
    });
  };

  useEffect(() => {
    if (results?.spinAngle) spinWheel(results.spinAngle);
  }, [results?.spinAngle]);

  const items = 6;
  const topGames = results?.votes?.slice(0, items) ?? [];
  const scoreSum = topGames.reduce((sum, a) => a.votes + sum, 0);

  return (
    <div>
      <Flex>
        <div style={{ flex: 1 }}>
          <div style={{ padding: "1rem 0.5rem" }}>
            <Text>Vote for custom game</Text>
            <Flex gap="xs">
              <Input
                value={gameInput}
                onChange={(e) => setGameInput(e.target.value)}
              />
              <Button onClick={() => voteForGame()}>Add</Button>
              {isAdmin == "1" && (
                <Button onClick={() => setIsAdmin("1")}>Make admin</Button>
              )}
              {isAdmin == "1" && (
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
            // provide data
            records={records}
            // define columns
            columns={[
              { accessor: "name" },
              {
                accessor: "maxPlayers",
                render: ({ maxPlayers }) => maxPlayers ?? "???",
              },
              {
                accessor: "actions",
                // this column has custom cell data rendering
                render: ({ name }) => (
                  <Box fw={700}>
                    <Button onClick={() => {}}>Vote</Button>
                  </Box>
                ),
              },
            ]}
            // execute this callback when a row is clicked
            onRowClick={({ record: { name } }) => {
              voteForGame(name);
              showNotification({
                title: `Clicked on ${name}`,
                message: `Voted ${name}`,
                withBorder: true,
              });
            }}
          />
        </div>
        <Flex style={{ flex: 1 }} direction="column">
          <div style={{ padding: "1rem" }}>
            <Text>Top votes:</Text>
            {results?.votes?.map((v, index) => (
              <Badge
                size="xl"
                variant="outline"
                color={index < 6 ? "green" : "blue"}
                style={{
                  marginInlineEnd: "0.5rem",
                  fontSize: "1." + Math.max(7 - index, 1) + "em",
                }}
                key={v.name}
              >
                {v.name} {v.votes}
              </Badge>
            ))}
          </div>
          <div>
            <fieldset className="ui-wheel-of-fortune">
              <ul ref={wheel}>
                {topGames.map((v, i) => (
                  <li
                    key={v.name}
                    /*style={{
                      aspectRatio: `1 / calc(2 * tan(180deg / ${items}))`,
                      background: `hsl(calc(360deg / ${items} * ${(v.votes / scoreSum) + i + 1}), 100%, 75%)`,
                      rotate: `calc(360deg / ${items} * calc(${(v.votes / scoreSum) + i}))`,
                    }}*/
                  >
                    {v.name}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <button type="button" onClick={sendWheel}>
                  SPIN
                </button>
              )}
            </fieldset>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
