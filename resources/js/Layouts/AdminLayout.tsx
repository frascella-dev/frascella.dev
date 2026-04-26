import type { ReactNode } from "react";
import {
    Experimental_CssVarsProvider as MaterialCssVarsProvider,
    experimental_extendTheme as materialExtendTheme,
    THEME_ID as MATERIAL_THEME_ID,
} from "@mui/material/styles";
import { CssVarsProvider as JoyCssVarsProvider, extendTheme } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";

// Joy UI's `extendTheme` typings haven't caught up to the runtime —
// `defaultColorScheme` is supported but not in the public option type.
const joyTheme = extendTheme({
    defaultColorScheme: "dark",
} as Parameters<typeof extendTheme>[0]);

// MUI X Charts is built on Material UI internals (not Joy) — without a
// Material theme present its styled components blow up with "Cannot read
// properties of undefined (reading 'create')". Wrapping Joy inside Material
// (using THEME_ID so they don't fight over the context) is the official
// pattern for mixing the two.
const materialTheme = materialExtendTheme();

/**
 * Wraps admin pages with the Joy UI theme provider + baseline reset.
 * The Material provider sits outside so chart components find their theme
 * while Joy components keep using their own.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <MaterialCssVarsProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>
            <JoyCssVarsProvider theme={joyTheme} modeStorageKey="ef-admin-mode">
                <CssBaseline />
                {children}
            </JoyCssVarsProvider>
        </MaterialCssVarsProvider>
    );
}
