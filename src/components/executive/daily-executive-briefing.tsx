import { ExecutivePanel } from "@/components/executive/executive-panel";

type DailyExecutiveBriefingProps = {
  dailyExecutiveBriefing: {
    title: string;
    message: string;
  }[];
};

const briefingTimes = ["08:00", "08:15", "08:30", "08:45", "09:00"];

function getBriefingTone(title: string) {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("risk")) {
    return {
      dotClass: "bg-amber-400",
      labelClass: "text-amber-200",
    };
  }

  if (normalizedTitle.includes("opportunity")) {
    return {
      dotClass: "bg-emerald-400",
      labelClass: "text-emerald-200",
    };
  }

  if (
    normalizedTitle.includes("ceo") ||
    normalizedTitle.includes("cfo") ||
    normalizedTitle.includes("board")
  ) {
    return {
      dotClass: "bg-[#C8A646]",
      labelClass: "text-[#F4D67A]",
    };
  }

  return {
    dotClass: "bg-[#2CC4E8]",
    labelClass: "text-[#9BE8F8]",
  };
}

export default function DailyExecutiveBriefing({
  dailyExecutiveBriefing,
}: DailyExecutiveBriefingProps) {
  return (
    <ExecutivePanel
      aria-labelledby="daily-executive-briefing-heading"
      className="mt-8"
      padding="lg"
      tone="blue"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <header>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
            Morning Situation Report
          </p>

          <h2
            id="daily-executive-briefing-heading"
            className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
          >
            Executive Decision Stream
          </h2>

          <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-nexus-muted">
            A role-based briefing sequence translating current procurement
            conditions into the first leadership decisions of the operating
            day.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                Briefing Items
              </p>

              <p className="mt-2 text-2xl font-black text-nexus-white">
                {dailyExecutiveBriefing.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                Operating Window
              </p>

              <p className="mt-2 text-2xl font-black text-nexus-white">
                60 min
              </p>
            </div>
          </div>
        </header>

        <ol className="relative border-l border-white/10 pl-6">
          {dailyExecutiveBriefing.length > 0 ? (
            dailyExecutiveBriefing.map((item, index) => {
              const tone = getBriefingTone(item.title);
              const briefingTime =
                briefingTimes[index] ??
                `09:${String((index - briefingTimes.length + 1) * 15).padStart(
                  2,
                  "0",
                )}`;

              return (
                <li
                  key={`${item.title}-${index}`}
                  className="relative pb-7 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full ring-4 ring-[#061426] ${tone.dotClass}`}
                  />

                  <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
                    <time className="text-xs font-black tracking-[0.14em] text-nexus-muted">
                      {briefingTime}
                    </time>

                    <div className="min-w-0">
                      <p
                        className={`break-words text-[10px] font-black uppercase tracking-[0.2em] ${tone.labelClass}`}
                      >
                        {item.title}
                      </p>

                      <p className="mt-2 break-words text-sm font-semibold leading-7 text-slate-200">
                        {item.message}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full bg-slate-500 ring-4 ring-[#061426]"
              />

              <p className="text-base font-black text-nexus-white">
                No briefing items available
              </p>

              <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-nexus-muted">
                The morning situation report will activate when procurement
                intelligence identifies a leadership-relevant signal.
              </p>
            </li>
          )}
        </ol>
      </div>
    </ExecutivePanel>
  );
}