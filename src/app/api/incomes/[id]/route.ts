import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const income = await prisma.income.findFirst({ where: { id, userId: session.id } });
  if (!income) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const { amount, description, date, source } = body;

    if (amount !== undefined && Number(amount) <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    const updated = await prisma.income.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(source !== undefined && { source }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar ingreso" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const income = await prisma.income.findFirst({ where: { id, userId: session.id } });
  if (!income) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
