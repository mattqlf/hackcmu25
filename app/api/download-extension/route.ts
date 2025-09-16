import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), "public", "arxivSync-extension.zip");

    // Check if zip file exists
    try {
      await fs.access(zipPath);
    } catch {
      return NextResponse.json(
        { error: "Chrome extension zip file not found" },
        { status: 404 }
      );
    }

    // Read the zip file
    const zipBuffer = await fs.readFile(zipPath);

    // Return the zip file as a download
    return new NextResponse(zipBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=arxivSync-extension.zip",
        "Content-Length": zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error serving extension zip:", error);
    return NextResponse.json(
      { error: "Failed to serve extension zip" },
      { status: 500 }
    );
  }
}