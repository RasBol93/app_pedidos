import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Este endpoint ya no acepta uploads directos. Usa el flujo presign a R2."
    },
    { status: 410 }
  );
}
