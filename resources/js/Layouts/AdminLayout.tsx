import type { ReactNode } from "react";
import { CssVarsProvider, extendTheme } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";

// Joy UI's `extendTheme` typings haven't caught up to the runtime —
// `defaultColorScheme` is supported but not in the public option type.
const theme = extendTheme({
    defaultColorScheme: "dark",
} as Parameters<typeof extendTheme>[0]);

/**
 * Wraps admin pages with the Joy UI theme provider + baseline reset.
 * The GlobalStyles override pushes Joy's body background past the
 * portfolio CSS that's still bundled into the same stylesheet.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <CssVarsProvider theme={theme} modeStorageKey="ef-admin-mode">
            <CssBaseline />
            {children}
        </CssVarsProvider>
    );
}
