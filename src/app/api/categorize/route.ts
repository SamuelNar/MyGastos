import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import OpenAI from "openai";

const openrouterApiKey = process.env.OPENAI_API_KEY_2?.trim();
const openai = new OpenAI({
  apiKey: openrouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "expense-tracker-ocr",
  },
});

const CATEGORIES = [
  "Alimentacion",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Educacion",
  "Servicios",
  "Compras",
  "Otros",
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!openrouterApiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY_2 no configurada" }, { status: 500 });
  }

  try {
    const { description, amount } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "Descripcion requerida" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-nano-30b-a3b:free",
      messages: [
        {
          role: "system",
          content: `Eres un clasificador de gastos. Dada la descripcion de un gasto, responde SOLO con el nombre de la categoria mas apropiada. Las categorias disponibles son: ${CATEGORIES.join(", ")}. Responde unicamente con el nombre de la categoria, nada mas.`,
        },
        {
          role: "user",
          content: `Gasto: "${description}"${amount ? ` por $${amount}` : ""}`,
        },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const category = response.choices[0]?.message?.content?.trim() || "Otros";
    const matched = CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase()) || "Otros";

    return NextResponse.json({ category: matched });
  } catch (error) {
    console.error("Categorize error:", error);
    return NextResponse.json({ category: "Otros" });
  }
}
