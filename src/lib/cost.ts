export const DEFAULT_TARIFF_PER_KWH = 8; // BDT

export function calculateCost(
  consumptionKwh: number,
  tariffPerKwh: number = DEFAULT_TARIFF_PER_KWH
): number {
  return Math.round(consumptionKwh * tariffPerKwh * 100) / 100;
}

// Estimate: grid emission factor (kg CO2e per kWh). Chaile bodle nite paro.
export const CARBON_KG_PER_KWH = 0.6;