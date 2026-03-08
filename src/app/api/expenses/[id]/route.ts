import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findFirst({ where: { id, userId: session.id } });
  if (!expense) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findFirst({ where: { id, userId: session.id } });
  if (!expense) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  const body = await req.json();

  if (body.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: body.categoryId, userId: session.id } });
    if (!category) {
      return NextResponse.json({ error: "Categoria invalida para este usuario" }, { status: 400 });
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      amount: body.amount ? Number(body.amount) : undefined,
      description: body.description || undefined,
      date: body.date ? new Date(body.date) : undefined,
      categoryId: body.categoryId || undefined,
    },
    include: { category: true },
  });

  return NextResponse.json(updated);
}
