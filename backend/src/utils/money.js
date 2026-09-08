/**
 * Converts a decimal currency input into ngwee.
 *
 * @param {number|string} value
 * @returns {number}
 * @throws {Error}
 */
function toAmountInt(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Invalid monetary amount supplied');
  }

  return Math.round(numericValue * 100);
}

/**
 * Converts a stored integer amount to a display-safe decimal number.
 *
 * @param {number|string} value
 * @returns {number}
 */
function fromAmountInt(value) {
  return Number(value || 0) / 100;
}

/**
 * Normalizes stored integer values regardless of whether the database
 * currently returns strings or numbers.
 *
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
function normalizeAmountInt(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  return Math.round(Number(value));
}

/**
 * Formats an integer amount for UI payloads.
 *
 * @param {number|string} value
 * @returns {string}
 */
function formatAmount(value) {
  return fromAmountInt(value).toFixed(2);
}

module.exports = {
  toAmountInt,
  fromAmountInt,
  normalizeAmountInt,
  formatAmount
};
