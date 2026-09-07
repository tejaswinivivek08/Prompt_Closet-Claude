import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { imageDataUrl } = await request.json();

  if (!imageDataUrl) {
    return NextResponse.json(
      { error: "imageDataUrl is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Background removal is not configured. Add REMOVEBG_API_KEY to your environment variables.",
      },
      { status: 503 },
    );
  }

  try {
    // Convert data URL to base64 string (strip the prefix)
    const base64Match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 },
      );
    }
    const base64Image = base64Match[2];

    const formData = new FormData();
    formData.append("image_file_b64", base64Image);
    formData.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        "[remove-background] remove.bg error:",
        res.status,
        errText,
      );
      return NextResponse.json(
        {
          error:
            "Background removal service returned an error. Original image will be used.",
        },
        { status: 502 },
      );
    }

    // remove.bg returns the PNG as binary
    const arrayBuffer = await res.arrayBuffer();
    const base64Result = Buffer.from(arrayBuffer).toString("base64");
    const resultDataUrl = `data:image/png;base64,${base64Result}`;

    return NextResponse.json({ resultDataUrl });
  } catch (err) {
    console.error("[remove-background] Unhandled error:", err);
    return NextResponse.json(
      { error: "Background removal failed. Original image will be used." },
      { status: 500 },
    );
  }
}
