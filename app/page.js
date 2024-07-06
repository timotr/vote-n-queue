'use client'

import { Flex, rem, Tabs, Text } from "@mantine/core";
import { IconDeviceGamepad2, IconListNumbers, IconSettings, IconWheel } from "@tabler/icons-react";
import Games from "./components/Games";

export default function Home() {
  const iconStyle = { width: rem(12), height: rem(12) };

  return (
    <div>
      <Flex gap="xl" style={{ fontSize: "1rem", padding: "2rem" }}>
        <div style={{flex: 1}}>Current game <Text style={{ fontSize: "2rem" }}>Retrocycles</Text></div>
        <div style={{flex: 1}}>Next game <Text style={{ fontSize: "2rem" }}>Age of Empires IV</Text></div>
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
