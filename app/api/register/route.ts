import { NextRequest, NextResponse } from "next/server";
import {
  createVoter,
  getVoterByNationalId,
  getVoterByRegion,
  getVoterByWallet,
  initializeDatabase,
} from "../../../lib/database";
import { VoterRegistration } from "../../../types/voter";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, region, wallet, nationalId, password }: VoterRegistration = await req.json();

    if (!firstName || !lastName || !region || !wallet || !nationalId || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // Initialize database (creates table if not exists)
    await initializeDatabase();

    // Check if wallet already exists
    const existingWallet = await getVoterByWallet(wallet);
    if (existingWallet) {
      return NextResponse.json({ error: "Wallet already registered" }, { status: 409 });
    }

    // Check if national ID already exists
    const existingNationalId = await getVoterByNationalId(nationalId);
    if (existingNationalId) {
      return NextResponse.json({ error: "National ID already registered" }, { status: 409 });
    }

    // Create new voter
    const newVoter = await createVoter({ firstName, lastName, region, wallet, nationalId, password });

    return NextResponse.json({
      success: true,
      voter: {
        id: newVoter.id,
        firstName: newVoter.first_name,
        lastName: newVoter.last_name,
        region: newVoter.region,
        wallet: newVoter.wallet,
        nationalId: newVoter.national_id,
        createdAt: newVoter.created_at,
      },
    });
  } catch (error: any) {
    console.error("Registration API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to retrieve voter info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");
    const region = searchParams.get("region");

    if (!wallet && !region) {
      return NextResponse.json({ error: "Wallet or region parameter required" }, { status: 400 });
    }

    let voter = null;
    let voters = null;

    if (wallet) {
      voter = await getVoterByWallet(wallet);
    } else if (region) {
      voters = await getVoterByRegion(region);
    }

    if (wallet && !voter) {
      return NextResponse.json({ error: "Voter not found" }, { status: 404 });
    }

    if (region) {
      return NextResponse.json({
        voters:
          voters?.map((v: any) => ({
            id: v.id,
            firstName: v.first_name,
            lastName: v.last_name,
            region: v.region,
            wallet: v.wallet,
            createdAt: v.created_at,
          })) || [],
      });
    }

    return NextResponse.json({
      voter: {
        id: voter.id,
        firstName: voter.first_name,
        lastName: voter.last_name,
        region: voter.region,
        wallet: voter.wallet,
        createdAt: voter.created_at,
      },
    });
  } catch (error) {
    console.error("Get voter API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
