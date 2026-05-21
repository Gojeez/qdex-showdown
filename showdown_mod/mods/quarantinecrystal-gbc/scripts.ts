// Quarantine Crystal — GBC-accurate format
// No physical/special split: damage category is determined purely by type
// (Physical: Normal Fighting Poison Ground Rock Bug Steel Dark Dragon)
// (Special:  Fire Water Grass Electric Psychic Ice Fairy Flying Ghost)
// (Strange:  per-move, see moves data)
// No abilities in this format.

export const Scripts: ModdedBattleScriptsData = {
	init() {
		// Override all abilities to be effectively blank in GBC mode.
		// Category is already baked into each move's data; no further override needed.
	},
};
