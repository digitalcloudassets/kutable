import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-emerald-600">
            Revenue: <span className="font-bold">${payload[0].value.toFixed(2)}</span>
          </p>
          <p className="text-blue-600">
            Bookings: <span className="font-bold">{payload[1]?.value || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

interface ServicePerformanceChartProps {
  data: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

export const ServicePerformanceChart: React.FC<ServicePerformanceChartProps> = ({ data }) => {
  const COLORS = ['#0066FF', '#00D4AA', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const chartData = data.map(service => ({
    name: service.name,
    value: service.revenue,
    bookings: service.bookings
  }));

  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.revenue, 0)) * 100).toFixed(0);
    return `${percent}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-emerald-600">
            Revenue: <span className="font-bold">${data.value.toFixed(2)}</span>
          </p>
          <p className="text-blue-600">
            Bookings: <span className="font-bold">{data.bookings}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface BookingTrendsChartProps {
  data: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
}

export const BookingTrendsChart: React.FC<BookingTrendsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          yAxisId="bookings"
          orientation="left"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          yAxisId="revenue"
          orientation="right"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-blue-600">
                    Bookings: <span className="font-bold">{payload[0].value}</span>
                  </p>
                  <p className="text-emerald-600">
                    Revenue: <span className="font-bold">${payload[1]?.value?.toFixed(2) || 0}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line 
          yAxisId="bookings"
          type="monotone" 
          dataKey="bookings" 
          stroke="#0066FF" 
          strokeWidth={3}
          dot={{ fill: '#0066FF', strokeWidth: 2, r: 4 }}
        />
        <Line 
          yAxisId="revenue"
          type="monotone" 
          dataKey="revenue" 
          stroke="#10B981" 
          strokeWidth={3}
          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

interface HourlyBookingsChartProps {
  data: Array<{
    hour: string;
    bookings: number;
  }>;
}

export const HourlyBookingsChart: React.FC<HourlyBookingsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="hour" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{label}:00</p>
                  <p className="text-blue-600">
                    Bookings: <span className="font-bold">{payload[0].value}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="bookings" 
          fill="#0066FF"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};