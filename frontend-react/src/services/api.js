// WaferIQ Cloud API Client
// Connects to AWS API Gateway / Lambda semiconductor analysis service

export const API_URL =
  "https://i81d4puvul.execute-api.ap-southeast-2.amazonaws.com/analyze";

/**
 * Submit a lot for quality analysis and AI investigation generation to AWS Lambda.
 * @param {Object} lot - Target manufacturing lot
 * @param {Array} comparisonLots - Reference lots of the same product
 * @returns {Promise<Object>} The analysis result including anomaly status and Bedrock brief
 */
export async function analyzeLotApi(lot, comparisonLots = []) {
  const payload = {
    lot: {
      lot_id: lot.lot_id,
      product_id: lot.product_id,
      tested_dies: Number(lot.tested_dies),
      passing_dies: Number(lot.passing_dies),
      process_step: lot.process_step || "Final Test",
      equipment_id: lot.equipment_id || "TESTER-01",
      recipe_revision: lot.recipe_revision || "REV-A",
    },
    comparison_lots: comparisonLots.map((r) => ({
      lot_id: r.lot_id,
      product_id: r.product_id,
      tested_dies: Number(r.tested_dies),
      passing_dies: Number(r.passing_dies),
      process_step: r.process_step || "Final Test",
      equipment_id: r.equipment_id || "TESTER-01",
      recipe_revision: r.recipe_revision || "REV-A",
    })),
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `API returned HTTP ${response.status} with non-JSON response.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Quality analysis request failed (HTTP ${response.status}).`
    );
  }

  return data;
}
