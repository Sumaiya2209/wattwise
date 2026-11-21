import { Schema, model, models } from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["office", "factory", "university", "commercial"],
      required: true,
    },
    address: String,
    contactEmail: String,
    tariffPerKwh: { type: Number, default: 8 }, // BDT per kWh
  },
  { timestamps: true }
);

export const Organization =
  models.Organization || model("Organization", OrganizationSchema);