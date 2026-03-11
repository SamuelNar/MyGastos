"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  CartesianGrid, Legend,
} from "recharts";

interface RecentExpense {
  id: string;
  amount: number;
  description: string;
  date: string;
  receipt: string | null;
  category: { name: string; color: string };
}

interface Stats {
  total: number;
  prevTotal: number;
  count: number;
  byCategory: { name: string; color: string; total: number; count: number }[];
  dailyTotals: { date: string; amount: number; cumulative: number }[];
  weeklyTotals: { week: string; amount: number }[];
  alerts: { category: string; budget: number; spent: number; percentage: number }[];
  recentExpenses: RecentExpense[];
  topExpense: { amount: number; description: string; category: string } | null;
  allTimeRecent: RecentExpense[];
}

interface IncomeStats {
  total: number;
  prevTotal: number;
  count: number;
  bySource: { source: string; total: number; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incomeStats, setIncomeStats] = useState<IncomeStats | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetch(`/api/expenses/stats?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setStats);
    fetch(`/api/incomes/stats?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setIncomeStats);
  }, [month, year]);

  if (!stats) return <div className="animate-pulse text-gray-400 p-8">Cargando estadisticas...</div>;

  const monthDiff = stats.prevTotal > 0
    ? Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 100)
    : null;

  const incomeTotal = incomeStats?.total ?? 0;
  const balance = incomeTotal - stats.total;
  const incomeDiff = (incomeStats?.prevTotal ?? 0) > 0
    ? Math.round(((incomeTotal - (incomeStats?.prevTotal ?? 0)) / (incomeStats?.prevTotal ?? 1)) * 100)
    : null;

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (month === 1) { setMonth(12); setYear(year - 1); }
              else setMonth(month - 1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            &larr;
          </button>
          <span className="text-sm font-medium px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg min-w-[120px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={() => {
              if (month === 12) { setMonth(1); setYear(year + 1); }
              else setMonth(month + 1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Budget alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((a) => (
            <div
              key={a.category}
              className={`p-3 rounded-lg text-sm font-medium ${
                a.percentage >= 100
                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
              }`}
            >
              {a.percentage >= 100 ? "Excedido" : "Alerta"}: {a.category} - Gastado ${a.spent.toFixed(2)} de ${a.budget.toFixed(2)} ({a.percentage}%)
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance card */}
        <div className={`p-5 rounded-xl shadow-sm border col-span-1 sm:col-span-2 lg:col-span-1 ${
          balance >= 0
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        }`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Balance del Mes</p>
          <p className={`text-3xl font-bold ${
            balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">ingresos - gastos</p>
        </div>
        {/* Total incomes */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos del Mes</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">${incomeTotal.toFixed(2)}</p>
          {incomeDiff !== null && (
            <p className={`text-xs mt-1 font-medium ${incomeDiff >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {incomeDiff > 0 ? "+" : ""}{incomeDiff}% vs mes anterior
            </p>
          )}
        </div>
        {/* Total expenses */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Gastos del Mes</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${stats.total.toFixed(2)}</p>
          {monthDiff !== null && (
            <p className={`text-xs mt-1 font-medium ${monthDiff > 0 ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}>
              {monthDiff > 0 ? "+" : ""}{monthDiff}% vs mes anterior
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Mayor Gasto</p>
          {stats.topExpense ? (
            <>
              <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">${stats.topExpense.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1 truncate">{stats.topExpense.description}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-300 dark:text-gray-600">-</p>
          )}
        </div>
      </div>

      {/* Charts row 1: Cumulative area + Daily bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gasto Acumulado del Mes</h2>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.dailyTotals}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "cumulative" ? "Acumulado" : "Dia"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={2} fill="url(#colorCumulative)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gastos por Dia</h2>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.dailyTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Monto"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>
      </div>

      {/* Charts row 2: Pie + Horizontal bars by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Distribucion por Categoria</h2>
          {stats.byCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    strokeWidth={2}
                  >
                    {stats.byCategory.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm flex-1">
                {stats.byCategory.map((c) => {
                  const pct = stats.total > 0 ? Math.round((c.total / stats.total) * 100) : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">${c.total.toFixed(2)}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Comparativa por Categoria</h2>
          {stats.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {stats.byCategory.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>
      </div>

      {/* Weekly comparison */}
      {stats.weeklyTotals.some((w) => w.amount > 0) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gastos por Semana</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="amount" name="Gasto semanal" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent expenses */}
      {(() => {
        const expensesToShow = stats.recentExpenses.length > 0
          ? stats.recentExpenses
          : stats.allTimeRecent;
        const isAllTime = stats.recentExpenses.length === 0 && stats.allTimeRecent.length > 0;

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold">
                {isAllTime ? "Ultimos Gastos (todos los meses)" : "Gastos del Mes"}
              </h2>
              {isAllTime && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                  No hay gastos en {monthNames[month - 1]} {year}
                </span>
              )}
            </div>
            {expensesToShow.length === 0 ? (
              <p className="p-6 text-gray-400 text-sm">No hay gastos registrados. Ve a Gastos o Escanear para agregar.</p>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {expensesToShow.map((exp) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      {exp.receipt ? (
                        <a href={exp.receipt} target="_blank" rel="noopener noreferrer">
                          <img src={exp.receipt} alt="Recibo" className="w-9 h-9 rounded object-cover border dark:border-gray-600" />
                        </a>
                      ) : (
                        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: exp.category.color + "20" }}>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.category.color }} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{exp.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {exp.category.name} - {new Date(exp.date).toLocaleDateString("es")}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">${exp.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
