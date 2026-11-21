import { Schema, model, models } from "mongoose";

const DepartmentSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
    name: { type: String, required: true, trim: true },
    managerId: { type: String }, // Better Auth user id
  },
  { timestamps: true }
);

DepartmentSchema.index({ organizationId: 1, buildingId: 1 });

export const Department =
  models.Department || model("Department", DepartmentSchema);