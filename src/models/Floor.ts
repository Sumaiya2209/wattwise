import { Schema, model, models } from "mongoose";

const FloorSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    level: { type: Number, required: true },
  },
  { timestamps: true }
);

FloorSchema.index({ buildingId: 1, level: 1 }, { unique: true });

export const Floor = models.Floor || model("Floor", FloorSchema);