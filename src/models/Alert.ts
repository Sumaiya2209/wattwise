import { Schema, model, models } from "mongoose";

const AlertSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building" },
    meterId: { type: Schema.Types.ObjectId, ref: "Meter" },
    thresholdId: { type: Schema.Types.ObjectId, ref: "Threshold" },
    type: { type: String, enum: ["high_usage", "unusual"], required: true },
    status: {
      type: String,
      enum: ["new", "acknowledged", "resolved"],
      default: "new",
    },
    message: { type: String, required: true },
    value: { type: Number, required: true },
    limit: Number,
    triggeredAt: { type: Date, required: true },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    resolvedBy: String,
    resolvedAt: Date,
    dedupKey: { type: String, unique: true, sparse: true }, // ek-i alert baar baar na toiri hoy
  },
  { timestamps: true }
);

AlertSchema.index({ organizationId: 1, status: 1, triggeredAt: -1 });

export const Alert = models.Alert || model("Alert", AlertSchema);