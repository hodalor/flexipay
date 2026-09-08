import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';
import { useDevices } from '@hooks/useDevices';
import { useLoans } from '@hooks/useLoans';
import { metricGridStyle } from '@/styles/layout';

function monthKey(dateValue) {
  const date = new Date(dateValue);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function formatCurrency(value) {
  return 'ZMW ' + (Number(value || 0) / 100).toFixed(2);
}

export default function Overview() {
  const devicesQuery = useDevices();
  const loansQuery = useLoans();
  const loans = loansQuery.data || [];
  const devices = devicesQuery.data || [];

  const analytics = useMemo(function buildAnalytics() {
    const activeLoans = loans.filter((loan) => loan.status === 'active');
    const overdueLoans = loans.filter((loan) => {
      return loan.status === 'defaulted' || (loan.status === 'active' && Number(loan.amountPaid || 0) < Number(loan.totalPayable || 0) && loan.nextDueDate && new Date(loan.nextDueDate) < new Date());
    });
    const defaultedLoans = loans.filter((loan) => loan.status === 'defaulted');
    const paidOffLoans = loans.filter((loan) => loan.status === 'paid_off');
    const lockedDevices = devices.filter((device) => device.isLocked);
    const totalPortfolioValue = activeLoans.reduce((sum, loan) => sum + Number(loan.totalPayable || 0), 0);
    const collectionsThisMonth = loans.reduce(function sumCollections(sum, loan) {
      return sum + Number(loan.amountPaid || 0);
    }, 0);
    const defaultRate = loans.length ? (defaultedLoans.length / loans.length) * 100 : 0;

    const collectionsByMonth = {};
    const paymentActivity = {};
    const recentPayments = [];
    const recentActions = [];
    const loanStatusCounts = {
      active: activeLoans.length,
      overdue: overdueLoans.length,
      defaulted: defaultedLoans.length,
      paid_off: paidOffLoans.length
    };

    loans.forEach(function aggregateLoan(loan) {
      (loan.payments || []).forEach(function aggregatePayment(payment) {
        const paidDate = payment.paidAt || payment.createdAt;

        if (!paidDate) {
          return;
        }

        const month = monthKey(paidDate);
        collectionsByMonth[month] = (collectionsByMonth[month] || 0) + Number(payment.amount || 0);
        const day = new Date(paidDate).toISOString().slice(0, 10);
        paymentActivity[day] = (paymentActivity[day] || 0) + Number(payment.amount || 0);

        recentPayments.push({
          id: payment.id,
          time: new Date(paidDate),
          label: (loan.customer?.fullName || 'Customer') + ' paid ' + formatCurrency(payment.amount)
        });
      });
    });

    devices.forEach(function aggregateDevice(device) {
      (device.commands || []).forEach(function aggregateCommand(command) {
        recentActions.push({
          id: command.id,
          time: new Date(command.deliveredAt || command.createdAt),
          label: (device.customerName || 'Customer') + ' device ' + command.command + ' command ' + command.status
        });
      });
    });

    const monthlyCollections = Object.keys(collectionsByMonth).sort().slice(-6).map(function toMonthRow(month) {
      return {
        month,
        amount: collectionsByMonth[month]
      };
    });

    const dailyPaymentActivity = Object.keys(paymentActivity).sort().slice(-30).map(function toDayRow(day) {
      return {
        day,
        amount: paymentActivity[day]
      };
    });

    const recentActivity = recentPayments.sort((left, right) => right.time - left.time).slice(0, 10)
      .concat(recentActions.sort((left, right) => right.time - left.time).slice(0, 5))
      .sort((left, right) => right.time - left.time)
      .slice(0, 15);

    return {
      activeLoans,
      overdueLoans,
      lockedDevices,
      totalPortfolioValue,
      collectionsThisMonth,
      defaultRate,
      monthlyCollections,
      dailyPaymentActivity,
      recentActivity,
      loanStatusChart: Object.keys(loanStatusCounts).map(function toStatusRow(key) {
        return {
          name: key,
          value: loanStatusCounts[key]
        };
      })
    };
  }, [loans, devices]);

  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="AI Portfolio Intelligence"
        title="Portfolio command center"
        subtitle="Track collections, device enforcement, and repayment health from one live surface. All operational pages refresh automatically so field activity from the mobile and desktop apps reflects here within seconds."
      />
      <div style={styles.grid}>
        <KPICard label="Total Active Loans" value={analytics.activeLoans.length} />
        <KPICard label="Total Portfolio Value (ZMW)" value={formatCurrency(analytics.totalPortfolioValue)} accent="#16a34a" />
        <KPICard label="Overdue Accounts" value={analytics.overdueLoans.length} accent="#d97706" />
        <KPICard label="Locked Devices" value={analytics.lockedDevices.length} accent="#dc2626" />
        <KPICard label="Collections This Month" value={formatCurrency(analytics.collectionsThisMonth)} accent="#0f766e" />
        <KPICard label="Default Rate %" value={analytics.defaultRate.toFixed(2) + '%'} accent="#475569" />
      </div>
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Monthly Collections</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={styles.tooltip} />
              <Legend />
              <Bar dataKey="amount" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Loan Status Mix</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={analytics.loanStatusChart} dataKey="value" nameKey="name" outerRadius={90}>
                {analytics.loanStatusChart.map(function renderCell(entry) {
                  const colorMap = {
                    active: '#0f766e',
                    overdue: '#f59e0b',
                    defaulted: '#dc2626',
                    paid_off: '#16a34a'
                  };
                  return <Cell key={entry.name} fill={colorMap[entry.name] || '#64748b'} />;
                })}
              </Pie>
              <Tooltip contentStyle={styles.tooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={styles.chartCard}>
        <h3 style={styles.cardTitle}>Daily Payment Activity</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={analytics.dailyPaymentActivity}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />
            <XAxis dataKey="day" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={styles.tooltip} />
            <Line type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.chartCard}>
        <h3 style={styles.cardTitle}>Recent Activity</h3>
        <div style={styles.activityList}>
          {analytics.recentActivity.map(function renderActivity(item) {
            return (
              <div key={item.id} style={styles.activityItem}>
                <div>{item.label}</div>
                <div style={styles.activityTime}>{item.time.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  grid: {
    ...metricGridStyle,
    marginBottom: '16px'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  chartCard: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.68) 100%)',
    borderRadius: '22px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    boxShadow: '0 24px 60px rgba(2, 6, 23, 0.22)'
  },
  cardTitle: {
    margin: '0 0 18px',
    color: '#f8fafc'
  },
  activityList: {
    display: 'grid',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 0',
    borderTop: '1px solid rgba(148, 163, 184, 0.12)',
    color: '#e2e8f0'
  },
  activityTime: {
    color: '#94a3b8'
  },
  tooltip: {
    background: '#0f172a',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: '14px',
    color: '#f8fafc'
  }
};
