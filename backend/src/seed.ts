/**
 * Seed Script – populates MongoDB with default loan plans.
 * Run: npm run seed (from backend directory)
 *
 * Safe to run multiple times – uses upsert to avoid duplicates.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { LoanScheme } from "./models/LoanScheme";

dotenv.config({ path: "../.env" });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/gold_loan_portal";

/** Seed data for loan plans */
const LOAN_PLANS = [
  {
    name: "Silver Saver",
    annualInterestRate: 7.0,
    tenureMonths: 3,
    maxLtv: 0.6, // 60%
    isActive: true,
  },
  {
    name: "Gold Standard",
    annualInterestRate: 10.5,
    tenureMonths: 6,
    maxLtv: 0.65, // 65%
    isActive: true,
  },
  {
    name: "Platinum Plus",
    annualInterestRate: 12.5,
    tenureMonths: 12,
    maxLtv: 0.70, // 70%
    isActive: true,
  },
  {
    name: "Diamond Premier",
    annualInterestRate: 14.0,
    tenureMonths: 24,
    maxLtv: 0.75, // 75% – maximum allowed
    isActive: true,
  },
  {
    name: "Quick Cash",
    annualInterestRate: 18.0,
    tenureMonths: 1,
    maxLtv: 0.55, // 55% – short term, lower LTV
    isActive: true,
  },
] as const;

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🌱 Seeding loan plans...");
    let created = 0;
    let skipped = 0;

    for (const plan of LOAN_PLANS) {
      const existing = await LoanScheme.findOne({ name: plan.name });
      if (existing) {
        console.log(`  ↷ Skipped (exists): ${plan.name}`);
        skipped++;
      } else {
        await LoanScheme.create(plan);
        console.log(`  ✓ Created: ${plan.name} (LTV: ${plan.maxLtv * 100}%)`);
        created++;
      }
    }

    console.log(`\n📊 Seed complete: ${created} created, ${skipped} skipped`);
    console.log("🔒 Disconnecting...");
    await mongoose.disconnect();
    console.log("✅ Done!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
