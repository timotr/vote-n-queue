'use client'

import { Flex, rem, Tabs, Text } from "@mantine/core";
import { IconDeviceGamepad2, IconListNumbers, IconSettings, IconWheel } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Games from "./components/Games";
import { fetcher } from "./components/fetcher";

const SPIN_DURATION_MS = 4000;

export default function Home() {
  const iconStyle = { width: rem(12), height: rem(12) };
  const [displayedNextGame, setDisplayedNextGame] = useState("");
  const lastObservedSpinAngle = useRef(null);
  const revealTimeout = useRef();
  const { data: results } = useSWR("/api/results", fetcher, {
    refreshInterval: 1000,
  });

  useEffect(() => {
    if (!results) return;

    if (lastObservedSpinAngle.current === null) {
      lastObservedSpinAngle.current = results.spinAngle;
      setDisplayedNextGame(results.nextGame ?? "");
      return;
    }

    if (lastObservedSpinAngle.current === results.spinAngle) {
      setDisplayedNextGame((current) => current || results.nextGame || "");
      return;
    }

    lastObservedSpinAngle.current = results.spinAngle;
    window.clearTimeout(revealTimeout.current);
    revealTimeout.current = window.setTimeout(() => {
      setDisplayedNextGame(results.nextGame ?? "");
    }, SPIN_DURATION_MS);

    return () => window.clearTimeout(revealTimeout.current);
  }, [results?.spinAngle, results?.nextGame]);

  return (
    <div>
      <Flex gap="xl" style={{ fontSize: "1rem", padding: "2rem" }}>
        <div style={{flex: 1}}>Next game <Text style={{ fontSize: "2rem" }}>{displayedNextGame || "Spin the wheel"}</Text></div>
      </Flex>
      <Tabs defaultValue="games">
        <Tabs.List>
          <Tabs.Tab value="queue" leftSection={<IconListNumbers style={iconStyle} />}>
            Queue
          </Tabs.Tab>
          <Tabs.Tab value="games" leftSection={<IconDeviceGamepad2 style={iconStyle} />}>
            Games
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings style={iconStyle} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="queue">
          Gallery tab content
        </Tabs.Panel>

        <Tabs.Panel value="games">
          <Games />
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          Settings tab content
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
