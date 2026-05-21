// Quarantine Crystal — Format definitions
// Two formats share the same moves/learnsets/pokedex base data.

export const Formats: FormatList = [
	{
		name: "[Gen 2] Quarantine Crystal GBC",
		mod: "quarantinecrystal-gbc",
		tier: "Custom",
		ruleset: [
			"Species Clause",
			"Sleep Clause Mod",
			"Freeze Clause Mod",
			"OHKO Clause",
			"Evasion Moves Clause",
			"Endless Battle Clause",
		],
		banned: [],
		desc: "Faithful GBC sim of Quarantine Crystal. No abilities, QC type split.",
	},
	{
		name: "[Modern] Quarantine Crystal",
		mod: "quarantinecrystal-modern",
		tier: "Custom",
		ruleset: [
			"Species Clause",
			"Sleep Clause Mod",
			"OHKO Clause",
			"Evasion Moves Clause",
			"Endless Battle Clause",
		],
		banned: [],
		desc: "Modernized Quarantine Crystal with abilities and physical/special split.",
	},
];
