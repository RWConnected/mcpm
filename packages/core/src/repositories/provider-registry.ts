import type {Manifest} from "../models/manifest.js";
import type {Config} from "../models/config.js";
import type {IO} from "../io/io.types.js";
import {validateProviders} from "../models/provider-config.js";
import {RepositoryService} from "./repository-service.js";
import {ModrinthRepository} from "./modrinth/modrinth-repository.js";
import {LocalRepository} from "./local/local-repository.js";
import {UrlRepository} from "./url/url-repository.js";
import {GitReleaseRepository} from "./git-release/git-release-repository.js";
import {VanillaTweaksRepository} from "./vanillatweaks/vanillatweaks-repository.js";
import {InvalidProviderRepository} from "./invalid-provider-repository.js";

/** Build a RepositoryService with the built-in Modrinth provider plus every provider
 * configured in the manifest. Invalid configs get a warning-only stand-in repository
 * instead of crashing or being silently dropped. */
export function buildRepositoryService(manifest: Manifest, config: Config, io: IO): RepositoryService {
  const service = new RepositoryService();
  service.addProvider("modrinth", new ModrinthRepository(config.modrinthToken));

  const { valid, invalid } = validateProviders(manifest.providers);

  for (const providerConfig of valid) {
    switch (providerConfig.type) {
      case "local":
        service.addProvider(providerConfig.id, new LocalRepository(providerConfig, config.projectDir));
        break;
      case "url":
        service.addProvider(providerConfig.id, new UrlRepository(providerConfig));
        break;
      case "github":
      case "gitlab":
        service.addProvider(providerConfig.id, new GitReleaseRepository(providerConfig));
        break;
      case "vanillatweaks":
        service.addProvider(providerConfig.id, new VanillaTweaksRepository(providerConfig));
        break;
    }
  }

  for (const { config: providerConfig, reason } of invalid) {
    service.addProvider(providerConfig.id, new InvalidProviderRepository(providerConfig.id, reason, io));
  }

  return service;
}
