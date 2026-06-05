// Quarantine Crystal Modern — additional moves available in the Modern format.
//
// This file is for vanilla Gen 9 moves you want to make BATTLE-USABLE in the
// Modern format. The base data (data/moves.ts) has QC custom moves only.
// Any vanilla Gen 9 move added here will override or extend the base.
//
// To add a vanilla Gen 9 move, copy its entry from a standard PS source and
// add it below WITHOUT `inherit: true` (since the base doesn't have vanilla moves).
//
// Example:
//   flamethrower: {
//     name: 'Flamethrower', num: 53, accuracy: 100, basePower: 90,
//     category: 'Special', pp: 15, type: 'Fire',
//     secondary: {chance: 10, status: 'brn'},
//     desc: 'Has a 10% chance to burn the target.',
//     shortDesc: '10% chance to burn the target.',
//   },

export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {

	// Add vanilla Gen 9 moves here as needed.

};
