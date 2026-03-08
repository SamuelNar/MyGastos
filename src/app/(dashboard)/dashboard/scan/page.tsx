"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configurar worker de PDF.js para usar el archivo local
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface Category {
  id: string;
  name: string;
}

async function convertPdfToImage(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error("No se pudo crear el contexto del canvas");

  await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error("Error al convertir canvas a blob");
      const imageFile = new File([blob], "converted-pdf.png", { type: "image/png" });
      resolve(imageFile);
    }, "image/png");
  });
}

export default function ScanPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", categoryId: "", date: "" });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  const processFile = useCallback(async (file: File) => {
    const isPdfFile = file.type === "application/pdf";
    setIsPdf(isPdfFile);
    setProcessing(true);
    setOcrText("");
    setSaved(false);
    setError("");
    setSuggestedCategory(null);
    setCategoryMessage("");

    try {
      let fileToProcess = file;

      // Si es PDF, convertirlo a imagen primero
      if (isPdfFile) {
        setPreview(null);
        fileToProcess = await convertPdfToImage(file);
        setPreview(URL.createObjectURL(fileToProcess));
      } else {
        setPreview(URL.createObjectURL(file));
      }

      const formData = new FormData();
      formData.append("image", fileToProcess);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al procesar");
        return;
      }

      setOcrText(data.ocrText || "");
      setImageUrl(data.imageUrl || null);

      const catMatch = categories.find((c) => c.name === data.category);
      const suggested = typeof data.suggestedCategory === "string" ? data.suggestedCategory.trim() : "";

      setForm({
        amount: data.amount ? String(data.amount) : "",
        description: data.description || "Recibo escaneado",
        categoryId: catMatch?.id || "",
        date: data.date || new Date().toISOString().split("T")[0],
      });
      setSuggestedCategory(suggested || null);
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    } finally {
      setProcessing(false);
    }
  }, [categories]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  async function handleCreateSuggestedCategory() {
    if (!suggestedCategory || creatingCategory) return;

    setCreatingCategory(true);
    setCategoryMessage("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suggestedCategory }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCategoryMessage(data.error || "No se pudo crear la categoria sugerida");
        return;
      }

      const updatedCategories: Category[] = await fetch("/api/categories").then((r) => r.json());
      setCategories(updatedCategories);
      setForm((prev) => ({ ...prev, categoryId: data.id }));
      setCategoryMessage("Categoria creada y seleccionada");
      setSuggestedCategory(null);
    } catch {
      setCategoryMessage("Error al crear la categoria sugerida");
    } finally {
      setCreatingCategory(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      processFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, ocrText, receipt: imageUrl }),
        });
        if (res.ok) {
          setSaved(true);
          setForm({ amount: "", description: "", categoryId: "", date: "" });
          setOcrText("");
          setPreview(null);
          setImageUrl(null);
        }
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Escanear Recibo (OCR con IA)</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
              : "dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
          }`}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
          ) : isPdf && processing ? (
            <div>
              <div className="text-6xl mb-3">&#128196;</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Procesando PDF...</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl text-gray-300 dark:text-gray-600 mb-2">&#128247;</div>
              <p className="text-gray-500 dark:text-gray-400">
                {dragging ? "Suelta el archivo aqui" : "Click o arrastra una imagen o PDF de recibo"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, PDF - Tickets, facturas, recibos</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">Procesado con IA Vision</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={handleFile} className="hidden" />

        {processing && (
          <div className="mt-4 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isPdf ? "Convirtiendo PDF y analizando con IA..." : "Analizando imagen con IA..."}
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>
        )}
      </div>

      {ocrText && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
            <h2 className="font-semibold mb-3">Texto Detectado por IA</h2>
            <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto">
              {ocrText}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
            <h2 className="font-semibold mb-3">Crear Gasto</h2>
            {saved ? (
              <div className="text-green-600 dark:text-green-400 font-medium p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                Gasto guardado correctamente!
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Monto (detectado por IA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripcion</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria (sugerida por IA)</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {suggestedCategory && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      La IA sugiere una categoria mas especifica: <strong>{suggestedCategory}</strong>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCreateSuggestedCategory}
                        disabled={creatingCategory}
                        className="px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                      >
                        {creatingCategory ? "Creando..." : "Crear y usar categoria"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestedCategory(null)}
                        className="px-3 py-1.5 text-sm rounded-md border border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30"
                      >
                        Mantener categoria actual
                      </button>
                    </div>
                    {categoryMessage && <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{categoryMessage}</p>}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  {saving ? "Guardando..." : "Guardar Gasto"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
