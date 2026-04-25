import { useRef } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
import FormHelperText from "@mui/joy/FormHelperText";
import FormLabel from "@mui/joy/FormLabel";
import IconButton from "@mui/joy/IconButton";
import Input from "@mui/joy/Input";
import JoyLink from "@mui/joy/Link";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Textarea from "@mui/joy/Textarea";
import Typography from "@mui/joy/Typography";
import {
    IconChevronRight,
    IconCircleCheck,
    IconHome,
    IconPhotoPlus,
    IconRotateClockwise,
    IconX,
} from "@tabler/icons-react";

import AdminDashboardLayout from "@/Layouts/AdminDashboardLayout.jsx";

function PictureTile({ src, label, removed, onToggleRemove }) {
    return (
        <Box
            sx={{
                position: "relative",
                width: 96,
                height: 96,
                borderRadius: "sm",
                overflow: "hidden",
                bgcolor: "background.level1",
                border: "1px solid",
                borderColor: "divider",
                opacity: removed ? 0.4 : 1,
                transition: "opacity 0.15s",
            }}
        >
            <Box
                component="img"
                src={src}
                alt={label}
                sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                }}
            />
            <IconButton
                size="sm"
                variant="solid"
                color={removed ? "neutral" : "danger"}
                onClick={onToggleRemove}
                aria-label={removed ? "Restore" : "Remove"}
                sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    "--IconButton-size": "24px",
                    boxShadow: "sm",
                }}
            >
                {removed ? (
                    <IconRotateClockwise size={12} stroke={2} />
                ) : (
                    <IconX size={12} stroke={2} />
                )}
            </IconButton>
        </Box>
    );
}

function StagedThumb({ file, onRemove }) {
    const url = URL.createObjectURL(file);
    return (
        <Box
            sx={{
                position: "relative",
                width: 96,
                height: 96,
                borderRadius: "sm",
                overflow: "hidden",
                bgcolor: "background.level1",
                border: "1px dashed",
                borderColor: "primary.outlinedBorder",
            }}
        >
            <Box
                component="img"
                src={url}
                alt={file.name}
                sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                }}
            />
            <IconButton
                size="sm"
                variant="solid"
                color="danger"
                onClick={onRemove}
                aria-label="Remove"
                sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    "--IconButton-size": "24px",
                    boxShadow: "sm",
                }}
            >
                <IconX size={12} stroke={2} />
            </IconButton>
        </Box>
    );
}

export default function TimelinesEdit() {
    const { props } = usePage();
    const entry = props.entry;
    const kinds = props.kinds ?? [];
    const flash = props.flash;
    const fileInputRef = useRef(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: "patch",
        year: entry.year,
        kind: entry.kind,
        title: entry.title,
        body: entry.body,
        pictures: [],
        removed_picture_ids: [],
    });

    const onPicturesPicked = (e) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setData("pictures", [...data.pictures, ...files]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeStaged = (index) => {
        setData(
            "pictures",
            data.pictures.filter((_, i) => i !== index),
        );
    };

    const toggleExistingRemoval = (id) => {
        const removed = data.removed_picture_ids;
        setData(
            "removed_picture_ids",
            removed.includes(id)
                ? removed.filter((x) => x !== id)
                : [...removed, id],
        );
    };

    const submit = (e) => {
        e.preventDefault();
        // Use POST + _method spoof so multipart works with PATCH semantics.
        post(`/admin/settings/timelines/${entry.id}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AdminDashboardLayout>
            <Head title={`Admin · ${entry.title}`} />
            <Box sx={{ flex: 1, width: "100%" }}>
                <Box sx={{ px: { xs: 2, md: 6 }, pt: { xs: 2, md: 0 } }}>
                    <Breadcrumbs
                        size="sm"
                        aria-label="breadcrumbs"
                        separator={<IconChevronRight size={14} stroke={1.75} />}
                        sx={{ pl: 0 }}
                    >
                        <JoyLink
                            component={Link}
                            underline="none"
                            color="neutral"
                            href="/admin/dashboard"
                            aria-label="Home"
                        >
                            <IconHome size={18} stroke={1.75} />
                        </JoyLink>
                        <Typography
                            color="neutral"
                            sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                            Settings
                        </Typography>
                        <JoyLink
                            component={Link}
                            underline="hover"
                            color="neutral"
                            href="/admin/settings/timelines"
                            sx={{ fontSize: 12, fontWeight: 500 }}
                        >
                            Timelines
                        </JoyLink>
                        <Typography
                            color="primary"
                            sx={{
                                fontWeight: 500,
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 280,
                            }}
                            title={entry.title}
                        >
                            {entry.title}
                        </Typography>
                    </Breadcrumbs>
                    <Typography level="h2" component="h1" sx={{ mt: 1, mb: 2 }}>
                        {entry.title}
                    </Typography>
                </Box>

                <Box
                    component="form"
                    onSubmit={submit}
                    sx={{
                        maxWidth: "800px",
                        mx: "auto",
                        px: { xs: 2, md: 6 },
                        py: { xs: 2, md: 3 },
                        width: "100%",
                    }}
                >
                    <Stack spacing={3}>
                        {flash && (
                            <Alert
                                color="success"
                                variant="soft"
                                size="sm"
                                startDecorator={
                                    <IconCircleCheck size={16} stroke={1.75} />
                                }
                            >
                                {flash}
                            </Alert>
                        )}

                        <Card>
                            <Typography level="title-md">Details</Typography>
                            <Divider />
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                sx={{ my: 1 }}
                            >
                                <FormControl
                                    error={!!errors.year}
                                    sx={{ width: { xs: "100%", sm: 140 } }}
                                >
                                    <FormLabel>Year</FormLabel>
                                    <Input
                                        size="sm"
                                        type="number"
                                        value={data.year}
                                        onChange={(e) =>
                                            setData(
                                                "year",
                                                Number(e.target.value),
                                            )
                                        }
                                        slotProps={{
                                            input: { min: 1900, max: 2100 },
                                        }}
                                    />
                                    {errors.year && (
                                        <FormHelperText>
                                            {errors.year}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                                <FormControl
                                    error={!!errors.kind}
                                    sx={{ flex: 1 }}
                                >
                                    <FormLabel>Kind</FormLabel>
                                    <Select
                                        size="sm"
                                        value={data.kind}
                                        onChange={(_, value) =>
                                            value && setData("kind", value)
                                        }
                                    >
                                        {kinds.map((k) => (
                                            <Option
                                                key={k}
                                                value={k}
                                                sx={{
                                                    textTransform: "capitalize",
                                                }}
                                            >
                                                {k}
                                            </Option>
                                        ))}
                                    </Select>
                                    {errors.kind && (
                                        <FormHelperText>
                                            {errors.kind}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                            </Stack>
                            <FormControl error={!!errors.title} sx={{ my: 1 }}>
                                <FormLabel>Title</FormLabel>
                                <Input
                                    size="sm"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData("title", e.target.value)
                                    }
                                />
                                {errors.title && (
                                    <FormHelperText>
                                        {errors.title}
                                    </FormHelperText>
                                )}
                            </FormControl>
                            <FormControl error={!!errors.body} sx={{ my: 1 }}>
                                <FormLabel>Body</FormLabel>
                                <Textarea
                                    size="sm"
                                    minRows={6}
                                    value={data.body}
                                    onChange={(e) =>
                                        setData("body", e.target.value)
                                    }
                                />
                                {errors.body && (
                                    <FormHelperText>
                                        {errors.body}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        </Card>

                        <Card>
                            <Typography level="title-md">Pictures</Typography>
                            <Typography level="body-sm" color="neutral">
                                Click × to mark for removal — pictures are
                                actually deleted only when you save.
                            </Typography>
                            <Divider />
                            <Stack spacing={2} sx={{ my: 1 }}>
                                {(entry.pictures.length > 0 ||
                                    data.pictures.length > 0) && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 1,
                                        }}
                                    >
                                        {entry.pictures.map((p) => (
                                            <PictureTile
                                                key={p.id}
                                                src={p.url}
                                                label={
                                                    p.alt ??
                                                    p.original_filename ??
                                                    ""
                                                }
                                                removed={data.removed_picture_ids.includes(
                                                    p.id,
                                                )}
                                                onToggleRemove={() =>
                                                    toggleExistingRemoval(p.id)
                                                }
                                            />
                                        ))}
                                        {data.pictures.map((file, i) => (
                                            <StagedThumb
                                                key={`${file.name}-${i}`}
                                                file={file}
                                                onRemove={() => removeStaged(i)}
                                            />
                                        ))}
                                    </Box>
                                )}
                                <Box>
                                    <Button
                                        type="button"
                                        variant="outlined"
                                        color="neutral"
                                        size="sm"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        startDecorator={
                                            <IconPhotoPlus
                                                size={16}
                                                stroke={1.75}
                                            />
                                        }
                                    >
                                        Add pictures
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                                        multiple
                                        onChange={onPicturesPicked}
                                        style={{ display: "none" }}
                                    />
                                </Box>
                                {Object.entries(errors)
                                    .filter(([key]) =>
                                        key.startsWith("pictures"),
                                    )
                                    .map(([key, msg]) => (
                                        <Typography
                                            key={key}
                                            level="body-xs"
                                            color="danger"
                                        >
                                            {msg}
                                        </Typography>
                                    ))}
                            </Stack>
                        </Card>

                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: "flex-end" }}
                        >
                            <Button
                                component={Link}
                                href="/admin/settings/timelines"
                                variant="outlined"
                                color="neutral"
                                size="sm"
                            >
                                Back to list
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                loading={processing}
                            >
                                Save changes
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Box>
        </AdminDashboardLayout>
    );
}
