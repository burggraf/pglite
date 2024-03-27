import { existsSync, mkdirSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { FilesystemBase } from "./types.js";
import { PGDATA } from "./index.js";
import { initDb } from "../initdb.js";
import loadPgShare from "../../release/share.js";
import type { EmPostgres } from "../../release/postgres.js";
import { nodeValues } from "../utils.js";
import type { DebugLevel } from "../index.js";

export class DenoFS extends FilesystemBase {
  protected rootDir: string;

  constructor(dataDir: string) {
    super(dataDir);
    this.rootDir = path.resolve(dataDir);
  }

  async init(debug?: DebugLevel) {
    if (!this.dataDir) {
      throw new Error("No datadir specified");
    }
    if (existsSync(path.join(this.dataDir, "PG_VERSION"))) {
      return false;
    }
    await Deno.mkdir(this.dataDir);
    await initDb(this.dataDir, debug);
    return true;
  }

  async emscriptenOpts(opts: Partial<EmPostgres>) {
    const options: Partial<EmPostgres> = {
      ...opts,
      preRun: [
        async (mod: any) => {
          const denofs = mod.FS.filesystems.DENOFS; // This will need to be implemented or adapted in the Emscripten module
          mod.FS.mkdir(PGDATA);
          mod.FS.mount(denofs, { root: this.rootDir }, PGDATA);
        },
      ],
    };
    const { require } = await nodeValues(); // This might need to be adapted based on how you handle module loading and compatibility
    loadPgShare(options, require); // This also might need adjustments for Deno
    return options;
  }
}
