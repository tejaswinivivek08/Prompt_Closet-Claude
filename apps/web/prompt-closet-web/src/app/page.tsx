import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F5F0EA" }}
    >
      {/* Nav */}
      <nav
        className="w-full px-8 py-5 flex items-center justify-between"
        style={{ backgroundColor: "#F5F0EA" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#C9847A" }}
          >
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <span className="text-lg font-bold" style={{ color: "#2B2B2B" }}>
            Prompt Closet
          </span>
        </div>
        <Link
          href="/auth"
          className="px-5 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: "#C9847A", color: "#FFFFFF" }}
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5DDD5" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "#C9847A" }}
            />
            <span style={{ color: "#7A6F68" }}>
              AI-powered wardrobe intelligence
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{
              color: "#2B2B2B",
              fontFamily: "Georgia, serif",
              maxWidth: "720px",
            }}
          >
            Your AI-Powered
            <br />
            <span style={{ color: "#C9847A" }}>Personal Stylist</span>
          </h1>

          {/* Sub */}
          <p
            className="text-lg md:text-xl mb-6 max-w-lg"
            style={{ color: "#7A6F68" }}
          >
            Stop wearing the same 20% of your closet. Let AI do the work.
          </p>

          {/* Stat pill */}
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-12"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            }}
          >
            <span className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
              148
            </span>
            <span style={{ color: "#7A6F68" }}>clothes</span>
            <div className="w-px h-6" style={{ backgroundColor: "#E5DDD5" }} />
            <span className="text-2xl font-bold" style={{ color: "#C9847A" }}>
              20%
            </span>
            <span style={{ color: "#7A6F68" }}>actually worn</span>
          </div>

          {/* CTA */}
          <Link
            href="/auth"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-semibold text-lg transition-all hover:opacity-90 mb-16"
            style={{
              backgroundColor: "#C9847A",
              boxShadow: "0 4px 24px rgba(201,132,122,0.4)",
            }}
          >
            <span>Try it free</span>
            <span>→</span>
          </Link>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            {[
              {
                icon: "👗",
                title: "Smart Closet",
                desc: "AI auto-tags every item in seconds. Find exactly what you want to wear — no more digging.",
                accent: "#C9847A",
              },
              {
                icon: "✨",
                title: "Magic Bar",
                desc: "Tell us the occasion — we'll curate complete outfits from your own wardrobe instantly.",
                accent: "#C9847A",
              },
              {
                icon: "🤳",
                title: "Digital Twin",
                desc: "See how outfits look on you before you wear them. No more guesswork.",
                accent: "#C9847A",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-8 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                  border: "1px solid #F0EBE6",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                  style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
                >
                  {icon}
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: "#2B2B2B" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#7A6F68" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center py-6 text-sm"
          style={{ color: "#7A6F68", borderTop: "1px solid #E5DDD5" }}
        >
          © 2026 Prompt Closet — Built with AI
        </footer>
      </main>
    </div>
  );
}
