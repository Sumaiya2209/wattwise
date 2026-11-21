import { Schema, model, models } from "mongoose";

const MeterSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    meterNumber: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["main", "sub"], default: "sub" },
    status: {
      type: String,
      enum: ["active", "inactive", "faulty"],
      default: "active",
    },
    lastReadingAt: Date,
  },
  { timestamps: true }
);

MeterSchema.index({ organizationId: 1, departmentId: 1 });

export const Meter = models.Meter || model("Meter", MeterSchema);