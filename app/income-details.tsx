import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { incomeAPI } from "../services/api";
import { formatPrice } from "../utils/priceFormatter";

interface IncomeSummary {
  id: number;
  owner_id: number;
  owner_name: string;
  period: string;
  total_sales: number;
  total_income: number;
  item_count: number;
}

type Period = "daily" | "monthly" | "yearly";

export default function IncomeDetailsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ period?: string }>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>(
    (params.period as Period) || "daily",
  );
  const [summaries, setSummaries] = useState<IncomeSummary[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const getLimit = (p: Period) => {
    switch (p) {
      case "daily":
        return 30;
      case "monthly":
        return 12;
      case "yearly":
        return 10;
      default:
        return 30;
    }
  };

  const fetchIncome = React.useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const limit = getLimit(period);
        const response = await incomeAPI.getSummary({
          period,
          page: pageNum,
          limit: limit,
          all: true,
        });

        const newSummaries = response.data.summaries || [];

        if (append) {
          setSummaries((prev) => [...prev, ...newSummaries]);
        } else {
          setSummaries(newSummaries);
        }

        setPage(pageNum);
        setTotalPages(response.data.pagination?.pages || 1);
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      } catch (error) {
        console.error("Error fetching income details:", error);
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    fetchIncome(1, false);
  }, [fetchIncome]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncome(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchIncome(page + 1, true);
  };

  // Get unique owners (from all loaded summaries)
  const owners = Array.from(new Set(summaries.map((s) => s.owner_name)));

  // Aggregate data by period
  const aggregateDataByPeriod = (data: IncomeSummary[]) => {
    const groupedIncome: { [key: string]: { [owner: string]: number } } = {};
    const groupedSales: { [key: string]: { [owner: string]: number } } = {};

    data.forEach((item) => {
      const date = new Date(item.period);
      let periodKey: string;

      if (period === "daily") {
        periodKey = item.period;
      } else if (period === "monthly") {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      } else {
        periodKey = `${date.getFullYear()}-01-01`;
      }

      if (!groupedIncome[periodKey]) {
        groupedIncome[periodKey] = {};
        groupedSales[periodKey] = {};
      }
      if (!groupedIncome[periodKey][item.owner_name]) {
        groupedIncome[periodKey][item.owner_name] = 0;
        groupedSales[periodKey][item.owner_name] = 0;
      }
      groupedIncome[periodKey][item.owner_name] += Number(item.total_income);
      groupedSales[periodKey][item.owner_name] += Number(item.total_sales);
    });

    return { income: groupedIncome, sales: groupedSales };
  };

  const aggregatedData = aggregateDataByPeriod(summaries);

  // Create aggregated summaries for detailed view
  const aggregatedSummariesArray: {
    periodKey: string;
    owner_name: string;
    total_income: number;
    total_sales: number;
    item_count: number;
  }[] = [];

  Object.keys(aggregatedData.income).forEach((periodKey) => {
    owners.forEach((owner) => {
      if (aggregatedData.income[periodKey][owner]) {
        const periodSummaries = summaries.filter((s) => {
          const date = new Date(s.period);
          let summaryPeriodKey: string;

          if (period === "daily") {
            summaryPeriodKey = s.period;
          } else if (period === "monthly") {
            summaryPeriodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
          } else {
            summaryPeriodKey = `${date.getFullYear()}-01-01`;
          }

          return summaryPeriodKey === periodKey && s.owner_name === owner;
        });

        const totalSales = periodSummaries.reduce(
          (sum, s) => sum + Number(s.total_sales),
          0,
        );
        const itemCount = periodSummaries.reduce(
          (sum, s) => sum + Number(s.item_count),
          0,
        );

        aggregatedSummariesArray.push({
          periodKey,
          owner_name: owner,
          total_income: aggregatedData.income[periodKey][owner],
          total_sales: totalSales,
          item_count: itemCount,
        });
      }
    });
  });

  // Sort by period descending
  aggregatedSummariesArray.sort(
    (a, b) => new Date(b.periodKey).getTime() - new Date(a.periodKey).getTime(),
  );

  const filteredSummaries = selectedOwner
    ? aggregatedSummariesArray.filter((s) => s.owner_name === selectedOwner)
    : aggregatedSummariesArray;

  const renderSummaryItem = ({
    item: summary,
    index,
  }: {
    item: (typeof aggregatedSummariesArray)[0];
    index: number;
  }) => {
    const date = new Date(summary.periodKey);
    let displayDate = "";
    if (period === "daily") {
      displayDate = date.toLocaleDateString();
    } else if (period === "monthly") {
      displayDate = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } else {
      displayDate = date.getFullYear().toString();
    }

    return (
      <View
        key={`${summary.periodKey}-${summary.owner_name}-${index}`}
        style={styles.summaryItem}
      >
        <View style={styles.summaryItemHeader}>
          <Text style={styles.summaryItemOwner}>{summary.owner_name}</Text>
          <Text style={styles.summaryItemPeriod}>{displayDate}</Text>
        </View>
        <View style={styles.summaryItemDetails}>
          <View style={styles.summaryItemDetail}>
            <Text style={styles.detailLabel}>{t("Sales:")}</Text>
            <Text style={styles.detailValue}>
              {formatPrice(Number(summary.total_sales))}
            </Text>
          </View>
          <View style={styles.summaryItemDetail}>
            <Text style={styles.detailLabel}>{t("Income:")}</Text>
            <Text style={[styles.detailValue, styles.incomeValue]}>
              {formatPrice(Number(summary.total_income))}
            </Text>
          </View>
          <View style={styles.summaryItemDetail}>
            <Text style={styles.detailLabel}>{t("Items")}:</Text>
            <Text style={styles.detailValue}>{summary.item_count}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Owner Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("Filter by Owner")}</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...owners]}
          keyExtractor={(item) => item || "all"}
          renderItem={({ item: owner }) => (
            <TouchableOpacity
              style={[
                styles.ownerChip,
                selectedOwner === owner && styles.ownerChipActive,
              ]}
              onPress={() => setSelectedOwner(owner)}
            >
              <Text
                style={[
                  styles.ownerChipText,
                  selectedOwner === owner && styles.ownerChipTextActive,
                ]}
              >
                {owner || t("All")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("Detailed Summary")}</Text>
        {filteredSummaries.length === 0 && !loading && (
          <Text style={styles.emptyText}>{t("No income data available")}</Text>
        )}
      </View>
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Period Filters - Fixed below header */}
      <View style={styles.periodFilters}>
        {(["daily", "monthly", "yearly"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              period === p && styles.periodButtonActive,
            ]}
            onPress={() => {
              setSummaries([]);
              setPage(1);
              setPeriod(p);
            }}
          >
            <Text
              style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}
            >
              {t(p.charAt(0).toUpperCase() + p.slice(1))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && summaries.length === 0 ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredSummaries}
          renderItem={renderSummaryItem}
          keyExtractor={(item, index) =>
            `${item.periodKey}-${item.owner_name}-${index}`
          }
          contentContainerStyle={styles.scrollView}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 10,
    backgroundColor: "white",
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  periodFilters: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  periodButtonTextActive: {
    color: "white",
  },
  loader: {
    marginTop: 40,
  },
  section: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  ownerChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  ownerChipActive: {
    backgroundColor: "#2196F3",
  },
  ownerChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  ownerChipTextActive: {
    color: "white",
  },
  summaryItem: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryItemOwner: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  summaryItemPeriod: {
    fontSize: 14,
    color: "#666",
  },
  summaryItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItemDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  incomeValue: {
    color: "#4CAF50",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    padding: 30,
    fontSize: 16,
  },
});
