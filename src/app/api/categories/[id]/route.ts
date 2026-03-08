import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { name, icon, color } = await req.json();

  const existing = await prisma.category.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name, icon, color },
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la categoria" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.category.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });

  const expenses = await prisma.expense.count({ where: { categoryId: id, userId: session.id } });
  if (expenses > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene gastos asociados" },
      { status: 400 }
    );
  }

  const budgets = await prisma.budget.count({ where: { categoryId: id, userId: session.id } });
  if (budgets > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene presupuestos asociados" },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
