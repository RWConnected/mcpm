import type { RepositoryService } from "../repositories/repository-service.js";
import type { IO } from "../io/io.types.js";

export class Search {
  static async run(
    repoService: RepositoryService,
    io: IO,
    query: string,
    page: number,
  ): Promise<void> {
    const results = await repoService.search(query, page);
    for (const r of results) {
      io.print(`[${r.source}] ${r.name} - ${r.url}`);
    }
  }
}
