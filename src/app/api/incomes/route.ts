import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const source = url.searchParams.get("source");

  const where: Record<string, unknown> = { userId: session.id };

  if (month && year) {
    const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endDate = new Date(Date.UTC(Number(year), Number(month), 1));
    where.date = { gte: startDate, lt: endDate };
  }

  if (source) {
    where.source = source;
  }

  const incomes = await prisma.income.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(incomes);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, description, date, source } = body;

    if (!amount || !description) {
      return NextResponse.json({ error: "Campos requeridos: amount, description" }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    const income = await prisma.income.create({
      data: {
        amount: Number(amount),
        description,
        date: date ? new Date(date) : new Date(),
        source: source || "Otro",
        userId: session.id,
      },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear ingreso" }, { status: 500 });
  }
}
