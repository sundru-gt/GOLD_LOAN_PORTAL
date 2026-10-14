import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * LoanScheme represents a gold loan product offered by the institution.
 * Max LTV is stored as a decimal (e.g., 0.75 = 75%) and never exceeds 0.75.
 */
export interface ILoanScheme extends Document {
  name: string;
  annualInterestRate: number; // Percentage (e.g., 12.5 = 12.5%)
  tenureMonths: number;       // Loan tenure in months
  maxLtv: number;             // Max Loan-to-Value ratio (0.0 – 0.75 decimal)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchemeSchema = new Schema<ILoanScheme>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    annualInterestRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    tenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    maxLtv: {
      type: Number,
      required: true,
      min: 0,
      // Business rule: Max LTV must never exceed 75%
      max: 0.75,
      validate: {
        validator: (v: number) => v <= 0.75,
        message: "maxLtv cannot exceed 0.75 (75%)",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for faster active-plan queries
LoanSchemeSchema.index({ isActive: 1 });

export const LoanScheme: Model<ILoanScheme> = mongoose.model<ILoanScheme>(
  "LoanScheme",
  LoanSchemeSchema
);
