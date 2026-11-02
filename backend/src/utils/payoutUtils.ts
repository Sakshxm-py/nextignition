/**
 * Payout Utilities for Next Ignition
 * Defines platform commission and calculates host settlements.
 */

export const PLATFORM_COMMISSION_RATE = 0.10; // 10% commission

export interface PayoutCalculation {
  totalRevenue: number;
  commission: number;
  netPayout: number;
}

/**
 * Calculates the commission and net payout for an event.
 * @param totalAmount The total amount collected for the event.
 * @returns PayoutCalculation object containing revenue, commission, and net payout.
 */
export const calculatePayout = (totalAmount: number): PayoutCalculation => {
  const commission = totalAmount * PLATFORM_COMMISSION_RATE;
  const netPayout = totalAmount - commission;

  return {
    totalRevenue: totalAmount,
    commission: Math.round(commission * 100) / 100, // Round to 2 decimal places
    netPayout: Math.round(netPayout * 100) / 100    // Round to 2 decimal places
  };
};

/**
 * Standardizes the "Powered by" branding text.
 */
export const BRANDING_TEXT = "Powered by Next Ignition";
