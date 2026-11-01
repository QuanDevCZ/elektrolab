import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, matchesSesit } from '../src/core/examples.js';
import { mediumById } from '../src/core/constants.js';
import { measure, touchShare } from '../src/core/physics.js';

// Každý „Příklad ze sešitu“ musí po zaokrouhlení ukázat přesně výsledek ze sešitu.
for (const ex of EXAMPLES) {
  test(`${ex.lesson} ${ex.title}: ${ex.expect.shown}`, () => {
    const medium = mediumById(ex.medium);
    assert.ok(medium, `neznámé prostředí ${ex.medium}`);
    const charges = ex.charges.map((c, i) => ({ id: i + 1, ...c }));
    const m = measure(charges, medium.epsR);
    assert.ok(matchesSesit(m.pair.F, ex.expect), `aplikace ${m.pair.F} vs sešit ${ex.expect.value}`);

    // scéna se vejde na stůl a kuličky se nepřekrývají
    const radius = ex.scale * 0.02;
    assert.ok(m.pair.r >= 2.5 * radius, 'náboje by se překrývaly');
    for (const c of charges) assert.ok(Math.abs(c.x) < ex.scale / 2);

    if (ex.expectE) {
      // intenzita v místě Q₁ (druhý náboj) od Q₀
      const sel = measure(charges, medium.epsR, charges[1].id).selected;
      assert.ok(matchesSesit(sel.E, ex.expectE), `E: aplikace ${sel.E} vs sešit ${ex.expectE.value}`);
    }
    for (const v of ex.variants ?? []) {
      // varianta b)–d): jiný Q₁ → jiná síla, intenzita stejná
      const vc = [charges[0], { ...charges[1], Q: v.Q }];
      const vm = measure(vc, medium.epsR, vc[1].id);
      assert.ok(matchesSesit(vm.pair.F, v), `varianta ${v.key}: ${vm.pair.F} vs ${v.value}`);
      assert.ok(matchesSesit(vm.selected.E, ex.expectE));
    }

    if (ex.afterTouch) {
      const [a, b] = touchShare(charges[0].Q, charges[1].Q);
      const after = measure([{ ...charges[0], Q: a }, { ...charges[1], Q: b }], medium.epsR);
      assert.ok(matchesSesit(after.pair.F, ex.afterTouch), `po doteku ${after.pair.F}`);
    }
  });
}
