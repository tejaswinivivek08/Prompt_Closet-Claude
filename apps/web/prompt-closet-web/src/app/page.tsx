import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-bold text-charcoal mb-6 leading-tight">
            Your AI-Powered Personal Stylist
          </h1>
          <p className="text-xl text-muted mb-8 max-w-2xl mx-auto">
            Stop wearing the same 20% of your closet. Let AI do the work.
          </p>

          {/* Stats Bar */}
          <div className="inline-flex items-center gap-2 bg-white/60 px-5 py-2 rounded-full mb-12 border border-border">
            <span className="text-charcoal font-medium">148 clothes</span>
            <span className="text-muted">•</span>
            <span className="text-rose-gold font-medium">Wear only 20%</span>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Smart Closet */}
            <div className="bg-white rounded-card p-8 shadow-sm border border-border text-left">
              <div className="text-4xl mb-4">👗</div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">
                Smart Closet
              </h3>
              <p className="text-muted">
                AI auto-tags every item. Find exactly what you want to wear in
                seconds.
              </p>
            </div>

            {/* Magic Bar */}
            <div className="bg-white rounded-card p-8 shadow-sm border border-border text-left">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">
                Magic Bar
              </h3>
              <p className="text-muted">
                Tell us the occasion. Get complete outfits curated from your
                wardrobe.
              </p>
            </div>

            {/* Digital Twin */}
            <div className="bg-white rounded-card p-8 shadow-sm border border-border text-left">
              <div className="text-4xl mb-4">🤳</div>
              <h3 className="text-xl font-semibold text-charcoal mb-3">
                Digital Twin
              </h3>
              <p className="text-muted">
                See how outfits look on you before you wear them.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-rose-gold text-white font-semibold px-8 py-4 rounded-full hover:bg-opacity-90 transition-colors"
          >
            Try it free
            <span>→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
