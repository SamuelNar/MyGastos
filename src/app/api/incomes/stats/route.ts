import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = Number(url.searchParams.get("month") || new Date().getMonth() + 1);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  const prevStart = new Date(Date.UTC(year, month - 2, 1));
  const prevEnd = new Date(Date.UTC(year, month - 1, 1));

  const incomes = await prisma.income.findMany({
    where: { userId: session.id, date: { gte: startDate, lt: endDate } },
    orderBy: { date: "desc" },
  });

  const prevIncomes = await prisma.income.findMany({
    where: { userId: session.id, date: { gte: prevStart, lt: prevEnd } },
  });

  const total = incomes.reduce((s, i) => s + i.amount, 0);
  const prevTotal = prevIncomes.reduce((s, i) => s + i.amount, 0);

  const bySource = incomes.reduce<Record<string, { source: string; total: number; count: number }>>((acc, i) => {
    const key = i.source;
    if (!acc[key]) acc[key] = { source: key, total: 0, count: 0 };
    acc[key].total += i.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  return NextResponse.json({
    total,
    prevTotal,
    count: incomes.length,
    bySource: Object.values(bySource).sort((a, b) => b.total - a.total),
    recent: incomes.slice(0, 5).map((i) => ({
      id: i.id,
      amount: i.amount,
      description: i.description,
      date: i.date.toISOString(),
      source: i.source,
    })),
  });
}
