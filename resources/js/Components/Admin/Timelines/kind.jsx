import {
    IconBriefcase,
    IconClock,
    IconCode,
    IconHeart,
    IconPlaneInflight,
    IconSchool,
} from "@tabler/icons-react";

const KIND_META = {
    life: { color: "primary", Icon: IconHeart },
    code: { color: "success", Icon: IconCode },
    work: { color: "warning", Icon: IconBriefcase },
    now: { color: "danger", Icon: IconClock },
    study: { color: "neutral", Icon: IconSchool },
    travel: { color: "neutral", Icon: IconPlaneInflight },
};

export function kindIcon(kind) {
    const Icon = KIND_META[kind]?.Icon;
    return Icon ? <Icon size={14} stroke={1.75} /> : null;
}

export function kindColor(kind) {
    return KIND_META[kind]?.color ?? "neutral";
}
