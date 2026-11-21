import { Schema, model, models } from "mongoose";

const ThresholdSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    scope: { type: String, enum: ["building", "meter"], required: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building" },
    meterId: { type: Schema.Types.ObjectId, ref: "Meter" },
    period: { type: String, enum: ["hourly", "daily"], default: "daily" },
    limitKwh: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Threshold =
  models.Threshold || model("Threshold", ThresholdSchema);