import { Schema, model, models } from "mongoose";

const EnergyRecordSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    meterId: { type: Schema.Types.ObjectId, ref: "Meter", required: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    consumption: { type: Number, required: true, min: 0 }, // kWh
    timestamp: { type: Date, required: true },
    estimatedCost: { type: Number, required: true, min: 0 },
  },
  { timestamps: false }
);

// Duplicate record prevent
EnergyRecordSchema.index({ meterId: 1, timestamp: 1 }, { unique: true });

// Aggregation query fast korar jonno
EnergyRecordSchema.index({ organizationId: 1, timestamp: -1 });
EnergyRecordSchema.index({ organizationId: 1, buildingId: 1, timestamp: -1 });
EnergyRecordSchema.index({ organizationId: 1, departmentId: 1, timestamp: -1 });

export const EnergyRecord =
  models.EnergyRecord || model("EnergyRecord", EnergyRecordSchema);