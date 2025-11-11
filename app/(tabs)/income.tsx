import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { incomeAPI } from '../../services/api';
import { formatPrice, getCurrencySymbol } from '../../utils/priceFormatter';
import { useBreakpoint } from '../../utils/responsive';

const screenWidth = Dimensions.get('window').width;

interface IncomeSummary {
  id: number;
  owner_id: number;
  owner_name: string;
  period: string;
  total_sales: number;
  total_income: number;
  item_count: number;
}

type Period = 'daily' | 'monthly' | 'yearly';

export default function IncomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const deviceType = useBreakpoint();
  useDocumentTitle('Income Analytics - Hein Pharmacy');
  const chartWidth = deviceType === 'desktop' || deviceType === 'largeDesktop' ? 800 : screenWidth;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('daily');
  const [summaries, setSummaries] = useState<IncomeSummary[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  const fetchIncome = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await incomeAPI.getSummary({ period });
      setSummaries(response.data.summaries || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncome();
    setRefreshing(false);
  };

  // Get unique owners
  const owners = Array.from(new Set(summaries.map(s => s.owner_name)));

  // Aggregate data by period (for monthly/yearly views)
  const aggregateDataByPeriod = (data: IncomeSummary[]) => {
    const groupedIncome: { [key: string]: { [owner: string]: number } } = {};
    const groupedSales: { [key: string]: { [owner: string]: number } } = {};
    
    data.forEach(item => {
      const date = new Date(item.period);
      let periodKey: string;
      
      if (period === 'daily') {
        periodKey = item.period; // Keep daily as is
      } else if (period === 'monthly') {
        // Group by month-year
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        // Group by year
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

  // Get current period key for filtering
  const getCurrentPeriodKey = () => {
    const today = new Date();
    if (period === 'daily') {
      return today.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'monthly') {
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      return `${today.getFullYear()}-01-01`;
    }
  };

  const currentPeriodKey = getCurrentPeriodKey();

  // Get period display label (Today, Month Name, or Year)
  const getPeriodLabel = () => {
    const today = new Date();
    if (period === 'daily') {
      return 'Today';
    } else if (period === 'monthly') {
      return today.toLocaleDateString(undefined, { month: 'long' });
    } else {
      return today.getFullYear().toString();
    }
  };

  const periodLabel = getPeriodLabel();

  // Calculate total sales by owner for CURRENT PERIOD ONLY (for cards and charts)
  const salesByOwnerCurrentPeriod = owners.map(owner => {
    const sales = aggregatedData.sales[currentPeriodKey]?.[owner] || 0;
    return { name: owner, sales };
  });

  // Calculate total sales by owner for ALL PERIODS (for detailed summary and trends)
  const salesByOwner = owners.map(owner => {
    let totalSales = 0;
    Object.keys(aggregatedData.sales).forEach(period => {
      totalSales += aggregatedData.sales[period][owner] || 0;
    });
    return { name: owner, sales: totalSales };
  });

  // Create aggregated summaries for detailed view
  const aggregatedSummariesArray: {
    periodKey: string;
    owner_name: string;
    total_income: number;
    total_sales: number;
    item_count: number;
  }[] = [];

  Object.keys(aggregatedData.income).forEach(periodKey => {
    owners.forEach(owner => {
      if (aggregatedData.income[periodKey][owner]) {
        // Sum up sales and items for this period and owner
        const periodSummaries = summaries.filter(s => {
          const date = new Date(s.period);
          let summaryPeriodKey: string;
          
          if (period === 'daily') {
            summaryPeriodKey = s.period;
          } else if (period === 'monthly') {
            summaryPeriodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          } else {
            summaryPeriodKey = `${date.getFullYear()}-01-01`;
          }
          
          return summaryPeriodKey === periodKey && s.owner_name === owner;
        });

        const totalSales = periodSummaries.reduce((sum, s) => sum + Number(s.total_sales), 0);
        const itemCount = periodSummaries.reduce((sum, s) => sum + Number(s.item_count), 0);

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
  aggregatedSummariesArray.sort((a, b) => 
    new Date(b.periodKey).getTime() - new Date(a.periodKey).getTime()
  );

  // Prepare line chart data (sales over time)
  const prepareLineChartData = () => {
    if (selectedOwner) {
      // Single owner selected: show one line
      const ownerData = aggregatedSummariesArray.filter(s => s.owner_name === selectedOwner);
      const periods = ownerData
        .map(s => s.periodKey)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(0, 6);
      
      return {
        labels: periods.map(p => {
          const date = new Date(p);
          return period === 'daily'
            ? `${date.getMonth() + 1}/${date.getDate()}`
            : period === 'monthly'
            ? `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`
            : date.getFullYear().toString();
        }),
        datasets: [
          {
            data: periods.map(p => {
              const item = ownerData.find(s => s.periodKey === p);
              return item ? item.total_sales : 0;
            }),
            strokeWidth: 2,
            color: () => '#2196F3', // Blue
          },
        ],
      };
    } else {
      // All owners: show multiple lines
      // Get all unique periods, sort ascending (old to new), take first 6
      const allPeriods = Object.keys(aggregatedData.sales)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(0, 6);

      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

      const datasets = owners.map((owner, index) => {
        const data = allPeriods.map(period => {
          return aggregatedData.sales[period][owner] || 0;
        });
        return {
          data,
          strokeWidth: 2,
          color: () => colors[index % colors.length],
        };
      });

      const labels = allPeriods.map(p => {
        const date = new Date(p);
        return period === 'daily'
          ? `${date.getMonth() + 1}/${date.getDate()}`
          : period === 'monthly'
          ? `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`
          : date.getFullYear().toString();
      });

      return { labels, datasets };
    }
  };

  const lineChartData = prepareLineChartData();

  // Prepare bar chart data (sales by owner - CURRENT PERIOD ONLY)
  // Truncate long names for bar chart labels
  const truncateName = (name: string, maxLength: number = 10) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + '..';
  };
  
  const barChartData = {
    labels: salesByOwnerCurrentPeriod.slice(0, 5).map(o => truncateName(o.name)),
    datasets: [
      {
        data: salesByOwnerCurrentPeriod.slice(0, 5).map(o => o.sales),
      },
    ],
  };

  // Prepare pie chart data (CURRENT PERIOD ONLY)
  const pieChartData = salesByOwnerCurrentPeriod.map((item, index) => ({
    name: truncateName(item.name, 12),
    sales: item.sales,
    color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'][index % 6],
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2196F3',
    },
  };

  // Calculate totals for CURRENT PERIOD ONLY
  const currentPeriodSummaries = aggregatedSummariesArray.filter(s => s.periodKey === currentPeriodKey);
  const totalIncome = currentPeriodSummaries.reduce((sum, s) => sum + Number(s.total_income), 0);
  const totalSales = currentPeriodSummaries.reduce((sum, s) => sum + Number(s.total_sales), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Income Analytics')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollView, { paddingBottom: insets.bottom + 50 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Filters */}
        <View style={styles.periodFilters}>
          {(['daily', 'monthly', 'yearly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
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

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.summaryCardLabel}>{t('Total Income')} ({periodLabel})</Text>
            <Text style={styles.summaryCardValue}>{formatPrice(totalIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.summaryCardLabel}>{t('Total Sales')} ({periodLabel})</Text>
            <Text style={styles.summaryCardValue}>{formatPrice(totalSales)}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        ) : (
          <>
            {/* Owner Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('Filter by Owner')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.ownerChip,
                    selectedOwner === null && styles.ownerChipActive,
                  ]}
                  onPress={() => setSelectedOwner(null)}
                >
                  <Text
                    style={[
                      styles.ownerChipText,
                      selectedOwner === null && styles.ownerChipTextActive,
                    ]}
                  >
                    {t('All')}
                  </Text>
                </TouchableOpacity>
                {owners.map((owner) => (
                  <TouchableOpacity
                    key={owner}
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
                      {owner}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sales Trend Chart */}
            {aggregatedSummariesArray.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Sales Trend')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={lineChartData}
                    width={Math.max(chartWidth, lineChartData.labels.length * 80)}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    yAxisLabel={getCurrencySymbol()}
                    yAxisSuffix=""
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    fromZero
                  />
                </ScrollView>
                {selectedOwner === null && owners.length > 1 && (
                  <View style={styles.legendContainer}>
                    {owners.map((owner, index) => (
                      <View key={owner} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendColor,
                            { backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'][index % 6] }
                          ]}
                        />
                        <Text style={styles.legendText}>{owner}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Sales by Owner Bar Chart */}
            {salesByOwner.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Sales by Owner')} ({periodLabel})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barChartData}
                    width={Math.max(screenWidth, salesByOwner.length * 100)}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    yAxisLabel={getCurrencySymbol()}
                    yAxisSuffix=""
                    fromZero
                    showValuesOnTopOfBars
                  />
                </ScrollView>
              </View>
            )}

            {/* Owner Distribution Pie Chart */}
            {pieChartData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Sales Distribution')} ({periodLabel})</Text>
                <PieChart
                  data={pieChartData}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="sales"
                  backgroundColor="transparent"
                  paddingLeft="20"
                  absolute
                  style={styles.chart}
                />
              </View>
            )}

            {/* Detailed List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('Detailed Summary')}</Text>
              {(selectedOwner 
                ? aggregatedSummariesArray.filter(s => s.owner_name === selectedOwner)
                : aggregatedSummariesArray
              ).slice(0, 3).map((summary, index) => {
                const date = new Date(summary.periodKey);
                let displayDate = '';
                if (period === 'daily') {
                  displayDate = date.toLocaleDateString();
                } else if (period === 'monthly') {
                  displayDate = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                } else {
                  displayDate = date.getFullYear().toString();
                }
                
                return (
                  <View key={`${summary.periodKey}-${summary.owner_name}-${index}`} style={styles.summaryItem}>
                    <View style={styles.summaryItemHeader}>
                      <Text style={styles.summaryItemOwner}>{summary.owner_name}</Text>
                      <Text style={styles.summaryItemPeriod}>
                        {displayDate}
                      </Text>
                    </View>
                    <View style={styles.summaryItemDetails}>
                      <View style={styles.summaryItemDetail}>
                        <Text style={styles.detailLabel}>{t('Sales:')}</Text>
                        <Text style={styles.detailValue}>
                          {formatPrice(Number(summary.total_sales))}
                        </Text>
                      </View>
                      <View style={styles.summaryItemDetail}>
                        <Text style={styles.detailLabel}>{t('Income:')}</Text>
                        <Text style={[styles.detailValue, styles.incomeValue]}>
                          {formatPrice(Number(summary.total_income))}
                        </Text>
                      </View>
                      <View style={styles.summaryItemDetail}>
                        <Text style={styles.detailLabel}>Items:</Text>
                        <Text style={styles.detailValue}>{summary.item_count}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              {aggregatedSummariesArray.length === 0 && (
                <Text style={styles.emptyText}>{t('No income data available')}</Text>
              )}
              {aggregatedSummariesArray.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push(`/income-details?period=${period}`)}
                >
                  <Text style={styles.viewAllButtonText}>{t('View All Records')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    // paddingVertical: 20,
  },
  scrollView: {
    paddingBottom: 20, // Base padding, additional padding added dynamically
  },
  periodFilters: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
  },
  summaryCardLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  loader: {
    marginTop: 40,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ownerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  ownerChipActive: {
    backgroundColor: '#2196F3',
  },
  ownerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  ownerChipTextActive: {
    color: 'white',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  summaryItem: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryItemOwner: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryItemPeriod: {
    fontSize: 14,
    color: '#666',
  },
  summaryItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItemDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  incomeValue: {
    color: '#4CAF50',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 40,
    fontSize: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  viewAllButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});