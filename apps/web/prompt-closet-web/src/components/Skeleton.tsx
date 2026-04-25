// Skeleton loader with shimmer animation for closet grid
export function ClosetGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden animate-pulse"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5DDD5",
          }}
        >
          {/* Image placeholder */}
          <div
            className="aspect-square"
            style={{
              background:
                "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
          {/* Text placeholder */}
          <div className="p-3 space-y-2">
            <div
              className="h-4 rounded"
              style={{
                background:
                  "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
            <div
              className="h-3 w-2/3 rounded"
              style={{
                background:
                  "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

// Single item skeleton for detail views
export function ItemCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5DDD5",
      }}
    >
      <div
        className="aspect-square"
        style={{
          background:
            "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }}
      />
      <div className="p-3 space-y-2">
        <div
          className="h-4 rounded"
          style={{
            background:
              "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
        <div
          className="h-3 w-2/3 rounded"
          style={{
            background:
              "linear-gradient(90deg, #F5F0EA 0%, #E5DDD5 50%, #F5F0EA 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
