import Box from "@mui/joy/Box";
import AdminLayout from "./AdminLayout.jsx";
import Sidebar from "@/Components/Admin/Sidebar.jsx";
import Header from "@/Components/Admin/Header.jsx";

/**
 * Shell for authenticated admin pages. Wraps children in the Joy UI theme
 * provider + the sticky-sidebar / mobile-header layout. Page components only
 * need to render their own content inside.
 */
export default function AdminDashboardLayout({ children }) {
    return (
        <AdminLayout>
            <Box sx={{ display: "flex", minHeight: "100dvh" }}>
                <Sidebar />
                <Header />
                <Box
                    component="main"
                    className="MainContent"
                    sx={{
                        pt: { xs: "calc(12px + var(--Header-height))", md: 3 },
                        pb: { xs: 2, sm: 2, md: 3 },
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                        height: "100dvh",
                        gap: 1,
                        overflow: "auto",
                    }}
                >
                    {children}
                </Box>
            </Box>
        </AdminLayout>
    );
}
