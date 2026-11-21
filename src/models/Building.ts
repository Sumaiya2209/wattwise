import { Schema, model, models } from "mongoose";

const BuildingSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: String,
    totalFloors: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BuildingSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Building = models.Building || model("Building", BuildingSchema);