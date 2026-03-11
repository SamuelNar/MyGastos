"use client";

import { useEffect, useState } from "react";

const SOURCES = ["Salario", "Freelance", "Inversiones", "Alquiler", "Negocio", "Bono", "Otro"];

interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
  source: string;
}

const SOURCE_COLORS: Record<string, string> = {
  Salario: "#10b981",
  Freelance: "#6366f1",
  Inversiones: "#f59e0b",
  Alquiler: "#3b82f6",
  Negocio: "#8b5cf6",
  Bono: "#ec4899",
  Otro: "#6b7280",
};

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [form, setForm] = useState({ amount: "", description: "", date: "", source: "Salario" });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => {
    loadIncomes();
  }, [filterSource, filterMonth, filterYear]);

  function loadIncomes() {
    const params = new URLSearchParams();
    if (filterSource) params.set("source", filterSource);
    if (filterMonth) params.set("month", filterMonth);
    if (filterYear) params.set("year", filterYear);
    fetch(`/api/incomes?${params}`).then((r) => r.json()).then(setIncomes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await fetch(`/api/incomes/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setEditId(null);
      } else {
        await fetch("/api/incomes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setForm({ amount: "", description: "", date: "", source: "Salario" });
      loadIncomes();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await fetch(`/api/incomes/${id}`, { method: "DELETE" });
    loadIncomes();
  }

  function handleEdit(inc: Income) {
    setEditId(inc.id);
    setForm({
      amount: String(inc.amount),
      description: inc.description,
      date: inc.date.split("T")[0],
      source: inc.source,
    });
  }

  const total = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ingresos</h1>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 space-y-4"
      >
        <h2 className="font-semibold">{editId ? "Editar Ingreso" : "Nuevo Ingreso"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Monto"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />
          <input
            type="text"
            placeholder="Descripcion"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {editId ? "Actualizar" : "Agregar"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm({ amount: "", description: "", date: "", source: "Salario" }); }}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Lista de Ingresos</h2>
            {incomes.length > 0 && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                Total: ${total.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Todas las fuentes</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Todos los meses</option>
              {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Año"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 dark:text-gray-100 w-24"
            />
          </div>
        </div>

        {incomes.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No hay ingresos registrados</p>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {incomes.map((inc) => {
              const color = SOURCE_COLORS[inc.source] ?? "#6b7280";
              return (
                <div key={inc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <p className="font-medium">{inc.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {inc.source} &mdash; {new Date(inc.date).toLocaleDateString("es")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">
                      +${inc.amount.toFixed(2)}
                    </span>
                    <button onClick={() => handleEdit(inc)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(inc.id)} className="text-sm text-red-500 dark:text-red-400 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
