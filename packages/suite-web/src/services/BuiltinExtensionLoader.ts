// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IExtensionLoader,
  LoadedExtension,
  TypeExtensionLoader,
} from "@lichtblick/suite-base/services/extension/IExtensionLoader";
import { Namespace } from "@lichtblick/suite-base/types";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

import { builtinExtensions } from "./builtinExtensions";

/**
 * Serves extensions bundled with the web app. The namespace must be "local"
 * so ExtensionCatalogProvider picks the loader up during the startup refresh;
 * readOnly excludes it from install/uninstall flows.
 */
export class BuiltinExtensionLoader implements IExtensionLoader {
  public readonly namespace: Namespace = "local";
  public readonly type: TypeExtensionLoader = "browser";
  public readonly readOnly = true;

  public async getExtension(id: string): Promise<ExtensionInfo | undefined> {
    return builtinExtensions.find((extension) => extension.info.id === id)?.info;
  }

  public async getExtensions(): Promise<ExtensionInfo[]> {
    return builtinExtensions.map(({ info }) => info);
  }

  public async loadExtension(id: string): Promise<LoadedExtension> {
    const extension = builtinExtensions.find((ext) => ext.info.id === id);
    if (!extension) {
      throw new Error(`Built-in extension ${id} not found`);
    }
    return { raw: extension.source };
  }

  public async installExtension(): Promise<ExtensionInfo> {
    throw new Error("Built-in extensions are read-only");
  }

  public async uninstallExtension(): Promise<void> {
    throw new Error("Built-in extensions are read-only");
  }
}
