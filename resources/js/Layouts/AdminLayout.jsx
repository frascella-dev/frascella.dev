import { CssVarsProvider, extendTheme } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";

const theme = extendTheme({
    defaultColorScheme: "dark",
});

/**
 * Wraps admin pages with the Joy UI theme provider + baseline reset.
 * The GlobalStyles override pushes Joy's body background past the
 * portfolio CSS that's still bundled into the same stylesheet.
 */
export default function AdminLayout({ children }) {
    return (
        <CssVarsProvider theme={theme} modeStorageKey="ef-admin-mode">
            <CssBaseline />
            {children}
        </CssVarsProvider>
    );
}
