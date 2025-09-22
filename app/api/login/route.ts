import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase, verifyVoterLogin } from "../../../lib/database";

export async function POST(req: NextRequest) {
  try {
    const { nationalId, password } = await req.json();

    if (!nationalId || !password) {
      return NextResponse.json({ error: "National ID and password are required" }, { status: 400 });
    }

    // Initialize database (creates table if not exists)
    await initializeDatabase();

    // Verify voter credentials
    const voter = await verifyVoterLogin(nationalId, password);

    if (!voter) {
      return NextResponse.json({ error: "Invalid National ID or password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      voter: {
        id: voter.id,
        firstName: voter.first_name,
        lastName: voter.last_name,
        region: voter.region,
        wallet: voter.wallet,
        nationalId: voter.national_id,
        createdAt: voter.created_at,
      },
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
