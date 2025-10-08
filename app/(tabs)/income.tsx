import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { incomeAPI } from '../../services/api';
import { formatPrice, getCurrencySymbol } from '../../utils/priceFormatter';
import { useTranslation } from 'react-i18next';

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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('monthly');
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

  // Filter summaries by selected owner
  const filteredSummaries = selectedOwner
    ? summaries.filter(s => s.owner_name === selectedOwner)
    : summaries;

  // Calculate total income by owner
  const incomeByOwner = owners.map(owner => {
    const ownerSummaries = summaries.filter(s => s.owner_name === owner);
    const totalIncome = ownerSummaries.reduce((sum, s) => sum + Number(s.total_income), 0);
    return { name: owner, income: totalIncome };
  });

  // Prepare line chart data (income over time)
  const prepareLineChartData = () => {
    if (selectedOwner) {
      // Single owner selected: show one line
      return {
        labels: filteredSummaries.slice(0, 6).map(s => {
          const date = new Date(s.period);
          return period === 'daily'
            ? `${date.getMonth() + 1}/${date.getDate()}`
            : period === 'monthly'
            ? `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`
            : date.getFullYear().toString();
        }),
        datasets: [
          {
            data: filteredSummaries.slice(0, 6).map(s => Number(s.total_income)),
            strokeWidth: 2,
            color: () => '#2196F3', // Blue
          },
        ],
      };
    } else {
      // All owners: show multiple lines
      // Get all unique periods, sort descending, take first 6
      const allPeriods = Array.from(new Set(summaries.map(s => s.period)))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 6);

      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

      const datasets = owners.map((owner, index) => {
        const ownerSummaries = summaries.filter(s => s.owner_name === owner);
        const data = allPeriods.map(period => {
          const summary = ownerSummaries.find(s => s.period === period);
          return summary ? Number(summary.total_income) : 0;
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

  // Prepare bar chart data (income by owner)
  const barChartData = {
    labels: incomeByOwner.slice(0, 5).map(o => o.name.split(' ')[0]),
    datasets: [
      {
        data: incomeByOwner.slice(0, 5).map(o => o.income),
      },
    ],
  };

  // Prepare pie chart data
  const pieChartData = incomeByOwner.map((item, index) => ({
    name: item.name,
    income: item.income,
    color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'][index % 6],
    legendFontColor: '#333',
    legendFontSize: 14,
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

  const totalIncome = summaries.reduce((sum, s) => sum + Number(s.total_income), 0);
  const totalSales = summaries.reduce((sum, s) => sum + Number(s.total_sales), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Income Analytics')}</Text>
      </View>

      <ScrollView
        style={styles.content}
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
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.summaryCardLabel}>{t('Total Income')}</Text>
            <Text style={styles.summaryCardValue}>{formatPrice(totalIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.summaryCardLabel}>{t('Total Sales')}</Text>
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

            {/* Income Trend Chart */}
            {filteredSummaries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Income Trend')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={lineChartData}
                    width={Math.max(screenWidth - 40, lineChartData.labels.length * 80)}
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

            {/* Income by Owner Bar Chart */}
            {incomeByOwner.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Income by Owner')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barChartData}
                    width={Math.max(screenWidth - 40, incomeByOwner.length * 100)}
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
                <Text style={styles.sectionTitle}>{t('Income Distribution')}</Text>
                <PieChart
                  data={pieChartData}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="income"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={styles.chart}
                />
              </View>
            )}

            {/* Detailed List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('Detailed Summary')}</Text>
              {filteredSummaries.map((summary) => (
                <View key={summary.id} style={styles.summaryItem}>
                  <View style={styles.summaryItemHeader}>
                    <Text style={styles.summaryItemOwner}>{summary.owner_name}</Text>
                    <Text style={styles.summaryItemPeriod}>
                      {new Date(summary.period).toLocaleDateString()}
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
              ))}
              {filteredSummaries.length === 0 && (
                <Text style={styles.emptyText}>{t('No income data available')}</Text>
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
    paddingTop: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
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
});