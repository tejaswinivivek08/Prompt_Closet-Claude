import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-ivory border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-charcoal">
          Prompt Closet
        </Link>
        <Link
          href="/auth"
          className="text-muted hover:text-charcoal transition-colors"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}
