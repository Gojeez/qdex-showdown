// Quarantine Crystal Modern — additional abilities available in the Modern format.
//
// The base data (data/abilities.ts) has QC custom abilities only.
// Any vanilla Gen 9 ability added here will override or extend the base.
//
// To add a vanilla Gen 9 ability, copy its entry from a standard PS source and
// add it below WITHOUT `inherit: true`.
//
// Example:
//   blaze: {
//     name: 'Blaze', num: 66,
//     onModifyAtkPriority: 5,
//     onModifyAtk(atk, attacker, defender, move) {
//       if (move.type === 'Fire' && attacker.hp <= attacker.maxhp / 3) {
//         return this.chainModify(1.5);
//       }
//     },
//     // ... SpA handler too
//     desc: 'At 1/3 or less of its max HP, this Pokemon\'s Fire-type attacks have 1.5x power.',
//     shortDesc: 'At 1/3 or less max HP, Fire-type attack power is 1.5x.',
//     rating: 2,
//   },

export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {

	// Add vanilla Gen 9 abilities here as needed.

};
