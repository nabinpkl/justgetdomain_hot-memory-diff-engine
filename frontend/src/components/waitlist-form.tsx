"use client";

const STATICFORMS_API_KEY = process.env.NEXT_PUBLIC_STATICFORMS_API_KEY ?? "";

export function WaitlistForm() {
  return (
    <form
      action="https://api.staticforms.dev/submit"
      method="POST"
      className="flex flex-col sm:flex-row mx-auto overflow-hidden rounded"
      style={{
        maxWidth: "440px",
        border: "1px solid var(--jgd-border)",
      }}
    >
      <input type="hidden" name="apiKey" value={STATICFORMS_API_KEY} />
      <input
        type="email"
        id="email"
        name="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        className="flex-1 px-4 py-3.5 text-[0.82rem] outline-none"
        style={{
          background: "var(--jgd-surface)",
          color: "var(--jgd-text)",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          border: "none",
        }}
      />
      <button
        type="submit"
        className="px-6 py-3.5 text-[0.72rem] font-bold uppercase tracking-[2px] cursor-pointer transition-colors"
        style={{
          background: "var(--jgd-accent)",
          color: "#000",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          border: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "oklch(0.75 0.25 142)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--jgd-accent)";
        }}
      >
        Notify me
      </button>
    </form>
  );
}
