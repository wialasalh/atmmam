import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const projectDir = path.resolve(process.cwd());
    const { stdout, stderr } = await execAsync("git pull origin main", { cwd: projectDir });
    return NextResponse.json({ success: true, output: stdout || stderr });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
