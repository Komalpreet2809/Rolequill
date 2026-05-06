import { extractText } from "unpdf";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { ResumeParseResponse } from "@/lib/rolequill-assistant";

export const runtime = "nodejs";


function normalizeResumeText(text: string) {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }

  const fileName = file.name || "resume";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  let text = "";

  if (file.type === "application/pdf" || extension === "pdf") {
    const buffer = await file.arrayBuffer();
    const { text: pages } = await extractText(new Uint8Array(buffer), { mergePages: true });
    text = Array.isArray(pages) ? pages.join("\n") : pages;
  } else {
    text = await file.text();
  }

  const normalized = normalizeResumeText(text);

  if (!normalized) {
    return NextResponse.json(
      { error: "The uploaded file did not produce readable text." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    fileName,
    text: normalized,
  } satisfies ResumeParseResponse);
}


