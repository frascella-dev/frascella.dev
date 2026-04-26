import { useEffect, useState } from "react";
import { useColorScheme } from "@mui/joy/styles";
import IconButton from "@mui/joy/IconButton";
import { IconMoon, IconSun } from "@tabler/icons-react";

function ColorSchemeToggle(props) {
    const { onClick, ...other } = props;
    const { mode, setMode } = useColorScheme();
    const [mounted, setMounted] = useState(false);

    // Defer the icon render until after hydration — `mode` is undefined on the
    // server, and committing to a guess would flash on mount.
    useEffect(() => setMounted(true), []);

    return (
        <IconButton
            aria-label="toggle light/dark mode"
            size="sm"
            variant="outlined"
            disabled={!mounted}
            onClick={(event) => {
                setMode(mode === "light" ? "dark" : "light");
                onClick?.(event);
            }}
            {...other}
        >
            {mode === "light" ? (
                <IconMoon size={18} stroke={1.75} />
            ) : (
                <IconSun size={18} stroke={1.75} />
            )}
        </IconButton>
    );
}

export default ColorSchemeToggle;
