/**
 * Style DNA Screen — Visualize your wardrobe's style clusters
 *
 * Shows:
 * 1. K-means clustering results with style labels
 * 2. Color palette, formality range, category distribution
 * 3. Silhouette score and evaluation metrics
 * 4. Each cluster's representative items
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import {
  computeStyleDNA,
  getCachedStyleDNA,
  hasEnoughItemsForStyleDNA,
} from "../../services/styleDnaService";
import type {
  StyleDNAResult,
  StyleCluster,
} from "../../services/styleDnaService";

const { width } = Dimensions.get("window");
const CLUSTER_CARD_WIDTH = (width - 48) / 2;

// Color palette for cluster visualization
const CLUSTER_COLORS = [
  "#C9847A", // rose gold
  "#8B7355", // taupe
  "#6B8E9B", // dusty teal
  "#9B8AA6", // lavender
  "#A67B5B", // camel
];

const FORMALITY_LABELS = [
  "Very Casual",
  "Casual",
  "Smart Casual",
  "Business",
  "Formal",
];

export default function StyleDNAScreen() {
  const { user } = useAuth();
  const [styleDNA, setStyleDNA] = useState<StyleDNAResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasEnoughItems, setHasEnoughItems] = useState(false);

  useEffect(() => {
    if (user) {
      loadStyleDNA();
    }
  }, [user]);

  async function loadStyleDNA(force = false) {
    if (!user) return;

    try {
      setError(null);

      // Check minimum items
      const enough = await hasEnoughItemsForStyleDNA(user.id);
      setHasEnoughItems(enough);

      if (!enough) {
        setLoading(false);
        return;
      }

      const result = await computeStyleDNA(user.id, force);
      setStyleDNA(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to compute Style DNA";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStyleDNA(true);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C9847A" />
        <Text style={styles.loadingText}>Analyzing your style...</Text>
      </View>
    );
  }

  if (!hasEnoughItems) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Style DNA</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Add more items to unlock Style DNA
          </Text>
          <Text style={styles.emptyText}>
            Style DNA analyzes clusters in your wardrobe. Add at least 30 items
            with photos to see your style profile.
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!styleDNA) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C9847A"
        />
      }
    >
      {/* Header */}
      <Text style={styles.title}>Your Style DNA</Text>

      {/* Metrics Strip */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Style Clusters"
          value={`${styleDNA.k_optimal}`}
          sub={`k=${styleDNA.k_optimal} (optimal)`}
        />
        <MetricCard
          label="Silhouette Score"
          value={styleDNA.silhouette_score.toFixed(3)}
          sub={formatSilhouette(styleDNA.silhouette_score)}
        />
      </View>

      {/* Elbow / Silhouette Chart Placeholder */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Cluster Quality</Text>
        <View style={styles.chartBars}>
          {styleDNA.silhouette_scores.map((score, i) => (
            <View key={i} style={styles.chartBar}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${Math.max(score * 100, 5)}%`,
                    backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                  },
                ]}
              />
              <Text style={styles.barLabel}>k={i + 2}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chartNote}>
          Silhouette scores by cluster count. Higher = better defined clusters.
        </Text>
      </View>

      {/* Cluster Grid */}
      <Text style={styles.sectionTitle}>Your Style Archetypes</Text>
      <View style={styles.clusterGrid}>
        {styleDNA.clusters.map((cluster) => (
          <ClusterCard key={cluster.cluster_id} cluster={cluster} />
        ))}
      </View>

      {/* Formality Range */}
      <View style={styles.formalityCard}>
        <Text style={styles.formalityTitle}>Your Formality Range</Text>
        <FormalitySlider clusters={styleDNA.clusters} />
      </View>

      {/* Footer note */}
      <Text style={styles.footer}>
        Computed {new Date(styleDNA.computed_at).toLocaleDateString()}
      </Text>
    </ScrollView>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function ClusterCard({ cluster }: { cluster: StyleCluster }) {
  const colorSwatches = cluster.dominant_colors.slice(0, 4);

  return (
    <View style={styles.clusterCard}>
      <View style={styles.clusterHeader}>
        <View
          style={[
            styles.clusterBadge,
            {
              backgroundColor:
                CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length],
            },
          ]}
        >
          <Text style={styles.clusterBadgeText}>
            {cluster.item_count} items
          </Text>
        </View>
      </View>

      <Text style={styles.clusterLabel}>{cluster.label}</Text>

      {/* Color swatches */}
      <View style={styles.colorRow}>
        {colorSwatches.map((color, i) => (
          <View
            key={i}
            style={[
              styles.colorSwatch,
              { backgroundColor: color.toLowerCase() },
            ]}
          />
        ))}
      </View>

      {/* Category */}
      <Text style={styles.clusterMeta}>
        {cluster.dominant_category.charAt(0).toUpperCase() +
          cluster.dominant_category.slice(1)}
      </Text>

      {/* Formality */}
      <Text style={styles.clusterMeta}>
        Formality: {cluster.avg_formality}/5 —{" "}
        {FORMALITY_LABELS[Math.round(cluster.avg_formality) - 1]}
      </Text>
    </View>
  );
}

function FormalitySlider({ clusters }: { clusters: StyleCluster[] }) {
  const allFormalities = clusters.map((c) => c.avg_formality);
  const minF = Math.min(...allFormalities);
  const maxF = Math.max(...allFormalities);

  return (
    <View>
      <View style={styles.formalityScale}>
        {FORMALITY_LABELS.map((label, i) => (
          <Text key={i} style={styles.formalityTick}>
            {i + 1}
          </Text>
        ))}
      </View>
      <View style={styles.formalityBar}>
        <View
          style={[
            styles.formalityMarker,
            {
              left: `${((minF - 1) / 4) * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.formalityRange,
            {
              left: `${((minF - 1) / 4) * 100}%`,
              width: `${((maxF - minF) / 4) * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.formalityMarker,
            {
              left: `${((maxF - 1) / 4) * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.formalityNote}>
        Range: {FORMALITY_LABELS[Math.round(minF) - 1]} →{" "}
        {FORMALITY_LABELS[Math.round(maxF) - 1]}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatSilhouette(score: number): string {
  if (score >= 0.5) return "Strong clusters";
  if (score >= 0.3) return "Moderate clusters";
  if (score >= 0.2) return "Weak clusters";
  return "No clear structure";
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F0EA",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B5B4E",
  },
  title: {
    fontSize: 28,
    fontFamily: "Georgia",
    fontWeight: "bold",
    color: "#3D2C29",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#C9847A",
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: "center",
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Georgia",
    fontWeight: "600",
    color: "#3D2C29",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B5B4E",
    textAlign: "center",
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: "#8B7355",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: "Georgia",
    fontWeight: "bold",
    color: "#3D2C29",
  },
  metricSub: {
    fontSize: 11,
    color: "#A69080",
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3D2C29",
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "80%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: "#A69080",
    marginTop: 4,
  },
  chartNote: {
    fontSize: 11,
    color: "#A69080",
    marginTop: 8,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Georgia",
    fontWeight: "600",
    color: "#3D2C29",
    marginBottom: 12,
  },
  clusterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  clusterCard: {
    width: CLUSTER_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  clusterHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  clusterBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clusterBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  clusterLabel: {
    fontSize: 15,
    fontFamily: "Georgia",
    fontWeight: "600",
    color: "#3D2C29",
    marginBottom: 6,
  },
  colorRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0D5CC",
  },
  clusterMeta: {
    fontSize: 11,
    color: "#6B5B4E",
    marginTop: 2,
  },
  formalityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formalityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3D2C29",
    marginBottom: 12,
  },
  formalityScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  formalityTick: {
    fontSize: 10,
    color: "#A69080",
  },
  formalityBar: {
    height: 8,
    backgroundColor: "#F0EBE5",
    borderRadius: 4,
    position: "relative",
  },
  formalityRange: {
    position: "absolute",
    top: 0,
    height: "100%",
    backgroundColor: "#C9847A",
    borderRadius: 4,
    opacity: 0.6,
  },
  formalityMarker: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C9847A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginLeft: -8,
  },
  formalityNote: {
    fontSize: 11,
    color: "#A69080",
    marginTop: 12,
    textAlign: "center",
  },
  footer: {
    fontSize: 11,
    color: "#A69080",
    textAlign: "center",
    marginTop: 8,
  },
});
