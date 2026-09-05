import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

export default function ProjectsLoading() {
  return (
    <main className={EXECUTIVE_PAGE_CLASS} aria-busy="true" aria-label="Loading Project Portfolio">
      <section className="animate-pulse rounded-[34px] border border-white/10 bg-white/[0.045] p-7 sm:p-9">
        <div className="h-3 w-40 rounded-full bg-white/10" />
        <div className="mt-5 h-12 w-full max-w-xl rounded-2xl bg-white/10" />
        <div className="mt-5 h-4 w-full max-w-3xl rounded-full bg-white/[0.07]" />
      </section>

      <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 sm:p-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.035]"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
