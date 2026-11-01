import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatCharge, formatSubstCharge, superscript } from '../src/core/format.js';

test('mocniny deseti jako v sešitě (tečka, horní index, typografické minus)', () => {
  assert.equal(superscript(-19), '⁻¹⁹');
  assert.equal(formatNumber(3596800, 2), '3,6·10⁶');
  assert.equal(formatNumber(4.86e-3, 2), '4,9·10⁻³');
  assert.equal(formatNumber(1.4387e-3, 3), '1,44·10⁻³');
  assert.equal(formatNumber(8.99e9, 3), '8,99·10⁹');
  assert.equal(formatNumber(9e9, 3), '9·10⁹');
});

test('běžná čísla bez mocnin, s desetinnou čárkou', () => {
  assert.equal(formatNumber(0.1167, 2), '0,12');
  assert.equal(formatNumber(0.034, 3), '0,034');
  assert.equal(formatNumber(0.5, 3), '0,5');
  assert.equal(formatNumber(1000, 3), '1000');
  assert.equal(formatNumber(997.2, 3), '997');
  assert.equal(formatNumber(-2.5, 3), '−2,5');
  assert.equal(formatNumber(0, 3), '0');
});

test('zaokrouhlení přes hranici řádu', () => {
  assert.equal(formatNumber(9.996e-3, 3), '0,01');
  assert.equal(formatNumber(9999.7, 3), '1·10⁴');
});

test('náboje s předponami nC / µC jako v hodině', () => {
  assert.equal(formatCharge(150e-9), '+150 nC');
  assert.equal(formatCharge(-20e-9), '−20 nC');
  assert.equal(formatCharge(1e-6), '+1 µC');
  assert.equal(formatCharge(2e-6), '+2 µC');
  assert.equal(formatCharge(0.01), '+0,01 C');
  assert.equal(formatCharge(-1.602e-19), '−1,602·10⁻¹⁹ C');
});

test('dosazení do vzorce: předpona → mocnina deseti, záporné v závorce', () => {
  assert.equal(formatSubstCharge(150e-9), '150·10⁻⁹');
  assert.equal(formatSubstCharge(-20e-9), '(−20·10⁻⁹)');
  assert.equal(formatSubstCharge(0.01), '0,01');
  assert.equal(formatSubstCharge(1.602e-19), '1,602·10⁻¹⁹');
});
