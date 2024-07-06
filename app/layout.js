import { Inter } from "next/font/google";
import '@mantine/core/styles.css';
import "./globals.css";
import { MantineProvider, ColorSchemeScript, createTheme } from '@mantine/core';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Vote n queue",
  description: "",
};

const theme = createTheme({
  defaultColorScheme: 'dark'
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">{children}</MantineProvider>
      </body>
    </html>
  );
}
