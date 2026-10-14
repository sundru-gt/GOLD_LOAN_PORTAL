import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Lead represents a gold loan application submitted by a customer.
 * Money values (loanAmount, goldValue) are stored in whole rupees (integers).
 * Mobile numbers are stored raw (unmasked) in DB; masking happens at API layer.
 */
export interface ILead extends Document {
  applicationId: string;        // Unique reference e.g. GL-1001
  name: string;
  mobile: string;               // Raw 10-digit mobile, NEVER expose unmasked
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: 18 | 22 | 24;
  planId: mongoose.Types.ObjectId;
  planName: string;
  pureGoldGrams: number;        // Computed: netWeight * (karat/24)
  goldValueRupees: number;      // Computed whole rupees
  loanAmountRupees: number;     // Computed whole rupees (floor)
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "DISBURSED";
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    grossWeightGrams: {
      type: Number,
      required: true,
    },
    netWeightGrams: {
      type: Number,
      required: true,
    },
    karat: {
      type: Number,
      required: true,
      enum: [18, 22, 24],
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "LoanScheme",
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    pureGoldGrams: {
      type: Number,
      required: true,
    },
    goldValueRupees: {
      type: Number,
      required: true,
    },
    loanAmountRupees: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "APPROVED", "REJECTED", "DISBURSED"],
      default: "SUBMITTED",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: used for duplicate detection (same mobile within 7 days)
LeadSchema.index({ mobile: 1, createdAt: -1 });

// Index for sorted pagination query
LeadSchema.index({ createdAt: -1 });

export const Lead: Model<ILead> = mongoose.model<ILead>("Lead", LeadSchema);
