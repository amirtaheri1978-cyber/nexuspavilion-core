"use client";

import { createContext, useContext } from "react";

import type { ExecutiveIntelligence } from "@/lib/executive/executive-types";

type ExecutiveIntelligenceContextValue = {
executive: ExecutiveIntelligence;
};

const ExecutiveIntelligenceContext =
createContext<ExecutiveIntelligenceContextValue | null>(null);

type ExecutiveIntelligenceProviderProps = {
executive: ExecutiveIntelligence;
children: React.ReactNode;
};

export function ExecutiveIntelligenceProvider({
executive,
children,
}: ExecutiveIntelligenceProviderProps) {
return (
<ExecutiveIntelligenceContext.Provider value={{ executive }}>
{children}
</ExecutiveIntelligenceContext.Provider>
);
}

export function useExecutiveIntelligence() {
const context = useContext(ExecutiveIntelligenceContext);

if (!context) {
throw new Error(
"useExecutiveIntelligence must be used within ExecutiveIntelligenceProvider.",
);
}

return context.executive;
}
