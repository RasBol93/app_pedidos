import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debes enviar un archivo." }, { status: 400 });
  }

  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();

  return NextResponse.json({
    success: true,
    file_reference: `mock-upload/${Date.now()}-${safeName}`,
    original_name: file.name
  });
}
