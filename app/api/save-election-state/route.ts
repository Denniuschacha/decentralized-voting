import { NextRequest, NextResponse } from "next/server";
import { saveElectionState } from "~~/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { electionStatus, voterData, candidateData, geographicalData, auditData, systemData, createdBy } = body;

    // Validate required fields
    if (!createdBy) {
      return NextResponse.json({ error: "Created by field is required" }, { status: 400 });
    }

    // Save election state to database
    const savedState = await saveElectionState({
      electionStatus,
      voterData,
      candidateData,
      geographicalData,
      auditData,
      systemData,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      message: "Election state saved successfully",
      data: savedState,
    });
  } catch (error) {
    console.error("Error saving election state:", error);
    return NextResponse.json({ error: "Failed to save election state" }, { status: 500 });
  }
}
