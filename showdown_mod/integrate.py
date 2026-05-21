#!/usr/bin/env python3
"""
Integrate showdown_mod/ output into the qdex-showdown repo.

Strategy (Option C):
  - data/pokedex.ts      ← GBC pokedex (254 QC species, No Ability) as the base
  - data/moves.ts        ← All QC moves (416 total, categories pre-baked)
  - data/learnsets.ts    ← QC learnsets
  - data/abilities.ts    ← QC abilities (Modern format)
  - data/mods/quarantinecrystal-gbc/   ← scripts.ts + mod.json only (no pokedex; base has it)
  - data/mods/quarantinecrystal-modern/ ← pokedex.ts (with abilities) + scripts.ts + mod.json
"""

import re
import shutil
from pathlib import Path

ROOT   = Path(__file__).parent.parent            # qdex-showdown/
GEN    = Path(__file__).parent                   # qdex-showdown/showdown_mod/
DATA   = GEN / "data"
MODS   = GEN / "mods"
RDATA  = ROOT / "data"
RMODS  = RDATA / "mods"

# ---------------------------------------------------------------------------
# Header rewrite helpers
# ---------------------------------------------------------------------------

# The generated files start with an optional comment line, then a broken
# import {"X"} line, then a blank line, then the export.  We strip those
# first two lines and replace with the correct type declaration.

HEADER_RE = re.compile(
    r"^(// [^\n]*\n)?"          # optional comment
    r"import \{[^}]+\} from [^\n]+;\n"  # broken import
    r"\n"                        # blank line
    r"export const (\w+): typeof \w+ = \{",
    re.MULTILINE,
)

TYPE_MAP = {
    # (export name, file depth from repo root) → correct type annotation
    ("Moves",      0): "import('../sim/dex-moves').MoveDataTable",
    ("Learnsets",  0): "import('../sim/dex-species').LearnsetDataTable",
    ("Abilities",  0): "import('../sim/dex-abilities').AbilityDataTable",
    ("Pokedex",    0): "import('../sim/dex-species').SpeciesDataTable",
    ("Pokedex",    3): "import('../../../sim/dex-species').ModdedSpeciesDataTable",
}

def fix_header(text: str, export_name: str, depth: int, comment: str = "") -> str:
    """Replace the broken import+typeof header with the correct PS type."""
    type_ann = TYPE_MAP.get((export_name, depth), f"any  /* FIXME: {export_name} */")
    new_header = ""
    if comment:
        new_header += f"// {comment}\n"
    new_header += f"export const {export_name}: {type_ann} = {{"

    # Strip everything up to and including the first "= {" on an export line
    idx = text.find("export const")
    if idx == -1:
        return text
    # find the "= {" in the export line
    eq_idx = text.find("= {", idx)
    if eq_idx == -1:
        return text
    return new_header + text[eq_idx + len("= {"):]


# ---------------------------------------------------------------------------
# Process shared data files → data/
# ---------------------------------------------------------------------------

def process_data_file(src: Path, dst: Path, export_name: str, comment: str = ""):
    text = src.read_text(encoding="utf-8")
    fixed = fix_header(text, export_name, depth=0, comment=comment)
    dst.write_text(fixed, encoding="utf-8")
    print(f"  {src.name} → {dst.relative_to(ROOT)}")


# ---------------------------------------------------------------------------
# Process mod pokedex file → data/mods/<mod>/pokedex.ts
# ---------------------------------------------------------------------------

def process_mod_pokedex(src: Path, dst: Path, comment: str = ""):
    text = src.read_text(encoding="utf-8")
    fixed = fix_header(text, "Pokedex", depth=3, comment=comment)
    dst.write_text(fixed, encoding="utf-8")
    print(f"  {src.name} → {dst.relative_to(ROOT)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=== Integrating showdown_mod into qdex-showdown ===\n")

    # ---- 1. Shared data files ----
    print("[1] Shared data files → data/")
    process_data_file(
        DATA / "moves.ts", RDATA / "moves.ts",
        "Moves",
        "Quarantine Crystal moves — QC type split + Strange categories",
    )
    process_data_file(
        DATA / "learnsets.ts", RDATA / "learnsets.ts",
        "Learnsets",
        "Quarantine Crystal learnsets",
    )
    process_data_file(
        DATA / "abilities.ts", RDATA / "abilities.ts",
        "Abilities",
        "Quarantine Crystal abilities",
    )
    # GBC pokedex → base data/pokedex.ts (254 QC species, no abilities)
    process_data_file(
        MODS / "quarantinecrystal-gbc" / "pokedex.ts", RDATA / "pokedex.ts",
        "Pokedex",
        "Quarantine Crystal base pokedex — no abilities (used by both GBC and Modern)",
    )
    print()

    # ---- 2. GBC mod directory ----
    print("[2] quarantinecrystal-gbc → data/mods/")
    gbc_dst = RMODS / "quarantinecrystal-gbc"
    gbc_dst.mkdir(parents=True, exist_ok=True)

    # GBC mod gets scripts.ts and mod.json only — species come from base pokedex.ts
    shutil.copy(MODS / "quarantinecrystal-gbc" / "scripts.ts", gbc_dst / "scripts.ts")
    print(f"  scripts.ts → {(gbc_dst / 'scripts.ts').relative_to(ROOT)}")
    shutil.copy(MODS / "quarantinecrystal-gbc" / "mod.json", gbc_dst / "mod.json")
    print(f"  mod.json   → {(gbc_dst / 'mod.json').relative_to(ROOT)}")
    print()

    # ---- 3. Modern mod directory ----
    print("[3] quarantinecrystal-modern → data/mods/")
    mod_dst = RMODS / "quarantinecrystal-modern"
    mod_dst.mkdir(parents=True, exist_ok=True)

    # Modern pokedex overrides abilities (full entries because gen9 base won't have QC species)
    process_mod_pokedex(
        MODS / "quarantinecrystal-modern" / "pokedex.ts",
        mod_dst / "pokedex.ts",
        "QC Modern pokedex — abilities populated where defined",
    )
    shutil.copy(MODS / "quarantinecrystal-modern" / "scripts.ts", mod_dst / "scripts.ts")
    print(f"  scripts.ts → {(mod_dst / 'scripts.ts').relative_to(ROOT)}")
    shutil.copy(MODS / "quarantinecrystal-modern" / "mod.json", mod_dst / "mod.json")
    print(f"  mod.json   → {(mod_dst / 'mod.json').relative_to(ROOT)}")
    print()

    print("Done.")


if __name__ == "__main__":
    main()
