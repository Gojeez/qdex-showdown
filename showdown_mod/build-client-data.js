#!/usr/bin/env node
'use strict';

// Generates browser-compatible client data files from the compiled qdex-showdown dist.
// Run from the qdex-showdown root: node showdown_mod/build-client-data.js
//
// Vanilla Gen 9 moves and abilities are fetched from the PS CDN and cached locally
// in showdown_mod/cache/. QC custom data takes precedence over vanilla for same IDs.

const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const serverDir = path.resolve(__dirname, '..');
const clientDataDir = path.resolve(__dirname, '..', '..', 'qdex-showdown-client', 'play.pokemonshowdown.com', 'data');
const cacheDir = path.resolve(__dirname, 'cache');

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function es3stringify(obj) {
	const buf = JSON.stringify(obj);
	return buf.replace(/"([A-Za-z][A-Za-z0-9]*)":/g, (fullMatch, key) => (
		['return', 'new', 'delete'].includes(key) ? fullMatch : `${key}:`
	));
}

function req(relPath) {
	// Clear require cache so we always get fresh data
	const abs = path.resolve(serverDir, relPath);
	delete require.cache[abs];
	return require(abs);
}

function fetchURL(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', chunk => data += chunk);
			res.on('end', () => resolve(data));
		}).on('error', reject);
	});
}

/**
 * Load a vanilla PS CDN data file, caching to disk for 7 days.
 * Returns the exported object (e.g. BattleMovedex) keyed by exportKey.
 */
async function loadVanillaCDN(label, exportKey, cdnUrl) {
	const cacheFile = path.join(cacheDir, `vanilla-${label}.json`);

	// Use cache if fresh
	if (fs.existsSync(cacheFile)) {
		const ageMs = Date.now() - fs.statSync(cacheFile).mtimeMs;
		if (ageMs < CACHE_MAX_AGE_MS) {
			const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
			process.stdout.write(`  ${label}: ${Object.keys(data).length} entries (cached)\n`);
			return data;
		}
	}

	process.stdout.write(`  Fetching vanilla ${label} from CDN... `);
	try {
		const raw = await fetchURL(cdnUrl);
		const ctx = { exports: {} };
		vm.runInNewContext(raw, ctx);
		const data = ctx.exports[exportKey] || {};

		if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
		fs.writeFileSync(cacheFile, JSON.stringify(data));
		process.stdout.write(`${Object.keys(data).length} entries cached\n`);
		return data;
	} catch (e) {
		process.stdout.write(`FAILED (${e.message}) — skipping vanilla ${label}\n`);
		return {};
	}
}

if (!fs.existsSync(clientDataDir)) {
	fs.mkdirSync(clientDataDir, { recursive: true });
}

(async () => {

	// ──────────────────────────────────────────────────────────────────────────
	// Fetch vanilla Gen 9 data (cached locally in showdown_mod/cache/)
	// ──────────────────────────────────────────────────────────────────────────
	console.log('Loading vanilla Gen 9 data from PS CDN...');
	const [VanillaMovedex, VanillaAbilities] = await Promise.all([
		loadVanillaCDN('moves', 'BattleMovedex', 'https://play.pokemonshowdown.com/data/moves.js'),
		loadVanillaCDN('abilities', 'BattleAbilities', 'https://play.pokemonshowdown.com/data/abilities.js'),
	]);

	// ──────────────────────────────────────────────────────────────────────────
	// pokedex.js — QC species + modern mod ability assignments
	//   Gen 2 teambuilder hides the ability slot automatically (dex.gen === 2)
	//   so it's safe to include abilities in the shared pokedex.
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building pokedex.js... ');
	{
		const { Pokedex } = req('dist/data/pokedex.js');

		// Merge in ability assignments from the Modern mod pokedex
		let modernPokedex = {};
		try {
			const mod = req('dist/data/mods/quarantinecrystal-modern/pokedex.js');
			modernPokedex = mod.Pokedex || {};
		} catch (e) {
			console.warn('\n  Warning: could not load modern mod pokedex:', e.message);
		}

		const merged = {};
		for (const id in Pokedex) {
			merged[id] = Object.assign({}, Pokedex[id]);
			if (modernPokedex[id] && modernPokedex[id].abilities) {
				merged[id].abilities = modernPokedex[id].abilities;
			}
		}

		fs.writeFileSync(
			path.join(clientDataDir, 'pokedex.js'),
			'exports.BattlePokedex = ' + es3stringify(merged) + ';\n'
		);
	}
	console.log('DONE');

	// ──────────────────────────────────────────────────────────────────────────
	// moves.js — vanilla Gen 9 base + QC overrides
	//   QC moves take precedence when IDs conflict with vanilla Gen 9.
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building moves.js (vanilla Gen 9 + QC overrides)... ');
	{
		const { Moves } = req('dist/data/moves.js');
		const merged = Object.assign({}, VanillaMovedex, Moves);
		fs.writeFileSync(
			path.join(clientDataDir, 'moves.js'),
			'exports.BattleMovedex = ' + es3stringify(merged) + ';\n'
		);
		console.log(`${Object.keys(merged).length} total moves`);
	}

	// ──────────────────────────────────────────────────────────────────────────
	// abilities.js — vanilla Gen 9 base + QC overrides
	//   QC abilities take precedence when IDs conflict with vanilla Gen 9.
	//   Gen 2 format: ability slot is hidden by teambuilder (dex.gen === 2).
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building abilities.js (vanilla Gen 9 + QC overrides)... ');
	{
		const { Abilities } = req('dist/data/abilities.js');
		const merged = Object.assign({}, VanillaAbilities, Abilities);
		fs.writeFileSync(
			path.join(clientDataDir, 'abilities.js'),
			'exports.BattleAbilities = ' + es3stringify(merged) + ';\n'
		);
		console.log(`${Object.keys(merged).length} total abilities`);
	}

	// ──────────────────────────────────────────────────────────────────────────
	// typechart.js — QC type chart (includes Strange type)
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building typechart.js... ');
	{
		const { TypeChart } = req('dist/data/typechart.js');
		fs.writeFileSync(
			path.join(clientDataDir, 'typechart.js'),
			'exports.BattleTypeChart = ' + es3stringify(TypeChart) + ';\n'
		);
	}
	console.log('DONE');

	// ──────────────────────────────────────────────────────────────────────────
	// learnsets.js
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building learnsets.js... ');
	{
		const { Learnsets } = req('dist/data/learnsets.js');
		fs.writeFileSync(
			path.join(clientDataDir, 'learnsets.js'),
			'exports.BattleLearnsets = ' + es3stringify(Learnsets) + ';\n'
		);
	}
	console.log('DONE');

	// ──────────────────────────────────────────────────────────────────────────
	// formats.js
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building formats.js... ');
	{
		const { Formats } = req('dist/config/formats.js');
		fs.writeFileSync(
			path.join(clientDataDir, 'formats.js'),
			'exports.Formats = ' + es3stringify(Formats) + ';\n'
		);
	}
	console.log('DONE');

	// ──────────────────────────────────────────────────────────────────────────
	// aliases.js — empty (no aliases in QC)
	// ──────────────────────────────────────────────────────────────────────────
	fs.writeFileSync(path.join(clientDataDir, 'aliases.js'), 'exports.BattleAliases = {};\n');

	// ──────────────────────────────────────────────────────────────────────────
	// formats-data.js — empty
	// ──────────────────────────────────────────────────────────────────────────
	fs.writeFileSync(path.join(clientDataDir, 'formats-data.js'), 'exports.BattleFormatsData = {};\n');

	// ──────────────────────────────────────────────────────────────────────────
	// search-index.js — QC species + moves + abilities + vanilla Gen 9 moves/abilities
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building search-index.js... ');
	{
		const { Pokedex } = req('dist/data/pokedex.js');
		const { Moves } = req('dist/data/moves.js');
		const { Abilities } = req('dist/data/abilities.js');

		// Include vanilla Gen 9 moves and abilities in the search index
		const allMoves = Object.assign({}, VanillaMovedex, Moves);
		const allAbilities = Object.assign({}, VanillaAbilities, Abilities);

		let index = [];
		for (const id in Pokedex) index.push(id + ' pokemon');
		for (const id in allMoves) index.push(id + ' move');
		for (const id in allAbilities) index.push(id + ' ability');
		index.sort();

		const BattleSearchIndex = index.map(x => x.split(' '));
		const BattleSearchIndexOffset = BattleSearchIndex.map(() => '');
		const BattleSearchCountIndex = {};

		let buf = '// DO NOT EDIT - generated by showdown_mod/build-client-data.js\n';
		buf += 'exports.BattleSearchIndex = ' + JSON.stringify(BattleSearchIndex) + ';\n';
		buf += 'exports.BattleSearchIndexOffset = ' + JSON.stringify(BattleSearchIndexOffset) + ';\n';
		buf += 'exports.BattleSearchCountIndex = ' + JSON.stringify(BattleSearchCountIndex) + ';\n';
		buf += 'exports.BattleArticleTitles = {};\n';
		fs.writeFileSync(path.join(clientDataDir, 'search-index.js'), buf);
	}
	console.log('DONE');

	// ──────────────────────────────────────────────────────────────────────────
	// teambuilder-tables.js — QC species list + learnsets
	//   Learnset gen codes: '29a' covers Gen 2 GBC (genChar='2') and
	//   Gen 9 Modern (genChar='a' for non-natdex Gen 9 formats).
	// ──────────────────────────────────────────────────────────────────────────
	process.stdout.write('Building teambuilder-tables.js... ');
	{
		const { Pokedex } = req('dist/data/pokedex.js');
		const { Learnsets } = req('dist/data/learnsets.js');

		const pokemonList = Object.keys(Pokedex).sort();
		const tiers = [['header', 'Quarantine Crystal'], ...pokemonList];

		// Flatten learnsets into teambuilder format: { speciesid: { moveid: '29a' } }
		// '29a' passes the genChar check for both Gen 2 ('2') and Gen 9 non-natdex ('a').
		const learnsets = {};
		for (const id in Learnsets) {
			const ls = Learnsets[id].learnset;
			if (!ls) continue;
			learnsets[id] = {};
			for (const moveid in ls) {
				learnsets[id][moveid] = '29a';
			}
		}

		const BattleTeambuilderTable = {
			tiers,
			formatSlices: { OU: 1 },
			overrideTier: {},
			items: [],
			metagameBans: {},
			learnsets,
		};

		let buf = '// DO NOT EDIT - generated by showdown_mod/build-client-data.js\n';
		buf += `exports.BattleTeambuilderTable = JSON.parse('${JSON.stringify(BattleTeambuilderTable).replace(/['\\]/g, '\\$&')}');\n`;
		fs.writeFileSync(path.join(clientDataDir, 'teambuilder-tables.js'), buf);
	}
	console.log('DONE');

	console.log('\nClient data written to:', clientDataDir);

})().catch(err => {
	console.error('Build failed:', err);
	process.exit(1);
});
