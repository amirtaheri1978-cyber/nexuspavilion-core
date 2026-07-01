"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DraftStatus =
| "idle"
| "dirty"
| "saving"
| "saved"
| "restored"
| "cleared"
| "error";

type UseRFQDraftAutosaveOptions<T> = {
storageKey: string;
value: T;
enabled?: boolean;
delay?: number;
};

type StoredDraft<T> = {
value: T;
savedAt: string;
};

function readHasStoredDraft(storageKey: string) {
if (typeof window === "undefined") return false;

try {
return Boolean(window.localStorage.getItem(storageKey));
} catch {
return false;
}
}

export function useRFQDraftAutosave<T>({
storageKey,
value,
enabled = true,
delay = 900,
}: UseRFQDraftAutosaveOptions<T>) {
const [status, setStatus] = useState<DraftStatus>("idle");
const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
const [hasStoredDraft, setHasStoredDraft] = useState(() =>
readHasStoredDraft(storageKey)
);

const hasMountedRef = useRef(false);
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
if (!enabled) return;

if (!hasMountedRef.current) {
hasMountedRef.current = true;
return;
}

if (statusTimeoutRef.current) {
clearTimeout(statusTimeoutRef.current);
}

if (saveTimeoutRef.current) {
clearTimeout(saveTimeoutRef.current);
}

statusTimeoutRef.current = setTimeout(() => {
setStatus("dirty");
}, 0);

saveTimeoutRef.current = setTimeout(() => {
try {
setStatus("saving");

const draft: StoredDraft<T> = {
value,
savedAt: new Date().toISOString(),
};

window.localStorage.setItem(storageKey, JSON.stringify(draft));

setLastSavedAt(draft.savedAt);
setHasStoredDraft(true);
setStatus("saved");
} catch {
setStatus("error");
}
}, delay);

return () => {
if (statusTimeoutRef.current) {
clearTimeout(statusTimeoutRef.current);
}

if (saveTimeoutRef.current) {
clearTimeout(saveTimeoutRef.current);
}
};
}, [delay, enabled, storageKey, value]);

const loadDraft = useCallback((): T | null => {
if (typeof window === "undefined") return null;

try {
const storedDraft = window.localStorage.getItem(storageKey);

if (!storedDraft) return null;

const parsedDraft = JSON.parse(storedDraft) as StoredDraft<T>;

setLastSavedAt(parsedDraft.savedAt);
setStatus("restored");

return parsedDraft.value;
} catch {
setStatus("error");
return null;
}
}, [storageKey]);

const clearDraft = useCallback(() => {
if (typeof window === "undefined") return;

try {
window.localStorage.removeItem(storageKey);
setHasStoredDraft(false);
setLastSavedAt(null);
setStatus("cleared");
} catch {
setStatus("error");
}
}, [storageKey]);

return {
status,
lastSavedAt,
hasStoredDraft,
loadDraft,
clearDraft,
};
}