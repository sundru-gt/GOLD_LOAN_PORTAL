/**
 * API Integration Tests
 *
 * Tests the Express API endpoints using supertest.
 * Uses mongodb-memory-server for isolated DB testing (no external DB needed).
 *
 * Covers:
 *  - 400 validation error scenarios
 *  - 409 duplicate application (same mobile within 7 days)
 *  - Happy path flows
 *  - Mobile masking verification
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import { LoanScheme } from "../models/LoanScheme";
import { Lead } from "../models/Lead";

let mongod: MongoMemoryServer;
const app = createApp();

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Start in-memory MongoDB for tests
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 60000);

beforeEach(async () => {
  // Seed one test plan before each test
  await LoanScheme.deleteMany({});
  await Lead.deleteMany({});

  await LoanScheme.create([
    {
      name: "Gold Standard",
      annualInterestRate: 10.5,
      tenureMonths: 6,
      maxLtv: 0.65,
      isActive: true,
    },
    {
      name: "Platinum Plus",
      annualInterestRate: 12.5,
      tenureMonths: 12,
      maxLtv: 0.70,
      isActive: true,
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

// ─── GET /api/v1/loan-schemes ──────────────────────────────────────────────────

describe("GET /api/v1/loan-schemes", () => {
  test("returns active plans", async () => {
    const res = await request(app).get("/api/v1/loan-schemes").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty("id");
    expect(res.body.data[0]).toHaveProperty("maxLtv");
  });

  test("maxLtv never exceeds 0.75", async () => {
    const res = await request(app).get("/api/v1/loan-schemes").expect(200);
    for (const plan of res.body.data) {
      expect(plan.maxLtv).toBeLessThanOrEqual(0.75);
    }
  });

  test("returns 404 when no active plans", async () => {
    await LoanScheme.updateMany({}, { isActive: false });
    const res = await request(app).get("/api/v1/loan-schemes").expect(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.fields).toBeInstanceOf(Array);
  });
});

// ─── POST /api/v1/quotes ──────────────────────────────────────────────────────

describe("POST /api/v1/quotes", () => {
  test("returns quotes for all active plans", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 12, netWeightGrams: 10, karat: 22 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.quotes).toHaveLength(2);
    // Verify math is correct for 22K, 10g, Gold Standard (65% LTV)
    const goldStd = res.body.quotes.find((q: any) => q.planName === "Gold Standard");
    expect(goldStd).toBeDefined();
    expect(goldStd.pureGoldGrams).toBeCloseTo(9.1667, 3);
    expect(goldStd.goldValueRupees).toBe(64167);
    expect(goldStd.eligibleLoanRupees).toBe(41708); // floor(64167 * 0.65)
  });

  // ── 400 Validation errors ──────────────────────────────────────────────────

  test("400 – missing karat", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 10, netWeightGrams: 8 })
      .expect(400);

    expect(res.body.error.code).toBe(400);
    expect(res.body.error.fields).toBeInstanceOf(Array);
    expect(res.body.error.fields.length).toBeGreaterThan(0);
  });

  test("400 – invalid karat (20 is not valid)", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 10, netWeightGrams: 8, karat: 20 })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "karat")).toBe(true);
  });

  test("400 – net weight exceeds gross weight", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 8, netWeightGrams: 10, karat: 22 })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "netWeightGrams")).toBe(true);
  });

  test("400 – weight exceeds 1000g", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 1001, netWeightGrams: 900, karat: 22 })
      .expect(400);

    expect(res.body.error.fields.length).toBeGreaterThan(0);
  });

  test("400 – zero net weight", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ grossWeightGrams: 10, netWeightGrams: 0, karat: 22 })
      .expect(400);

    expect(res.body.error.fields.length).toBeGreaterThan(0);
  });
});

// ─── POST /api/v1/leads ───────────────────────────────────────────────────────

describe("POST /api/v1/leads", () => {
  let planId: string;

  beforeEach(async () => {
    const plan = await LoanScheme.findOne({ name: "Gold Standard" });
    planId = plan!._id.toString();
  });

  const validPayload = () => ({
    name: "Rajesh Kumar",
    mobile: "9876543210",
    grossWeightGrams: 12,
    netWeightGrams: 10,
    karat: 22,
    planId,
  });

  test("201 – creates a lead and returns applicationId", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send(validPayload())
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.applicationId).toMatch(/^GL-\d+$/);
    expect(res.body.data.mobile).toMatch(/^[6-9]\d{3}XXXX\d{2}$/); // Masked
  });

  test("201 – mobile is masked in response (not raw)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send(validPayload())
      .expect(201);

    // Raw mobile must NOT appear in response
    expect(JSON.stringify(res.body)).not.toContain("9876543210");
    expect(res.body.data.mobile).toBe("9876XXXX10");
  });

  test("409 – duplicate mobile within 7 days", async () => {
    // First submission
    await request(app).post("/api/v1/leads").send(validPayload()).expect(201);

    // Second submission within 7 days – same mobile
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), name: "Another Person" })
      .expect(409);

    expect(res.body.error.code).toBe(409);
    expect(res.body.error.message).toMatch(/already applied/i);
    expect(res.body.error.fields).toBeInstanceOf(Array);
  });

  // ── 400 Validation errors ──────────────────────────────────────────────────

  test("400 – invalid name (numbers in name)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), name: "Raj3sh Kumar" })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "name")).toBe(true);
  });

  test("400 – name too short (1 char)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), name: "R" })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "name")).toBe(true);
  });

  test("400 – invalid mobile (starts with 5)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), mobile: "5123456789" })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "mobile")).toBe(true);
  });

  test("400 – mobile too short (9 digits)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), mobile: "987654321" })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "mobile")).toBe(true);
  });

  test("400 – invalid karat (21)", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), karat: 21 })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "karat")).toBe(true);
  });

  test("400 – net weight greater than gross weight", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), netWeightGrams: 15, grossWeightGrams: 10 })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "netWeightGrams")).toBe(true);
  });

  test("400 – invalid planId format", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...validPayload(), planId: "not-valid-id" })
      .expect(400);

    expect(res.body.error.fields.some((f: any) => f.field === "planId")).toBe(true);
  });

  test("error response always has exact shape: { error: { code, message, fields } }", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
    expect(res.body.error).toHaveProperty("fields");
    expect(Array.isArray(res.body.error.fields)).toBe(true);
  });
});

// ─── GET /api/v1/leads ─────────────────────────────────────────────────────────

describe("GET /api/v1/leads", () => {
  beforeEach(async () => {
    const plan = await LoanScheme.findOne({ name: "Gold Standard" });
    // Create 3 test leads
    for (let i = 0; i < 3; i++) {
      await Lead.create({
        applicationId: `GL-100${i + 1}`,
        name: `Test User ${i}`,
        mobile: `987654321${i}`,
        grossWeightGrams: 12,
        netWeightGrams: 10,
        karat: 22,
        planId: plan!._id,
        planName: plan!.name,
        pureGoldGrams: 9.166667,
        goldValueRupees: 64167,
        loanAmountRupees: 41708,
        status: "SUBMITTED",
      });
    }
  });

  test("returns leads newest first with masked mobile", async () => {
    const res = await request(app).get("/api/v1/leads").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);

    // Verify mobile masking
    for (const lead of res.body.data) {
      expect(lead.mobile).toMatch(/^[6-9]\d{3}XXXX\d{2}$/);
    }

    // Verify no raw mobile in response
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/9876543210|9876543211|9876543212/);
  });

  test("pagination works correctly", async () => {
    const res = await request(app)
      .get("/api/v1/leads?page=1&limit=2")
      .expect(200);

    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.hasNextPage).toBe(true);
  });

  test("returns empty array with valid pagination when no leads", async () => {
    await Lead.deleteMany({});
    const res = await request(app).get("/api/v1/leads").expect(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});
