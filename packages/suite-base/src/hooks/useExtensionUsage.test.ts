/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";

import { useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import { BasicBuilder } from "@lichtblick/test-builders";

import {
  useExtensionUsage,
  useMessageConverterExtensionsInUse,
  usePanelExtensionsInUse,
} from "./useExtensionUsage";

jest.mock("@lichtblick/suite-base/context/CurrentLayoutContext");
jest.mock("@lichtblick/suite-base/context/ExtensionCatalogContext");
jest.mock("@lichtblick/suite-base/components/MessagePipeline");

const mockUseCurrentLayoutActions = useCurrentLayoutActions as jest.Mock;
const mockUseExtensionCatalog = useExtensionCatalog as jest.Mock;
const mockUseMessagePipeline = useMessagePipeline as jest.Mock;

describe("usePanelExtensionsInUse", () => {
  const mockGetCurrentLayoutState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentLayoutActions.mockReturnValue({
      getCurrentLayoutState: mockGetCurrentLayoutState,
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: {},
        installedMessageConverters: [],
        installedCameraModels: new Map(),
      }),
    );
  });

  it("returns an empty set when layout is undefined", () => {
    // Given
    mockGetCurrentLayoutState.mockReturnValue({ selectedLayout: undefined });

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("returns an empty set when installedPanels is undefined", () => {
    // Given
    const panelType = BasicBuilder.string();
    mockGetCurrentLayoutState.mockReturnValue({
      selectedLayout: { data: { layout: `${panelType}!${BasicBuilder.string()}`, configById: {} } },
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ installedPanels: undefined }),
    );

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("returns the extension ID for a panel registered to an extension", () => {
    // Given
    const panelType = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockGetCurrentLayoutState.mockReturnValue({
      selectedLayout: { data: { layout: `${panelType}!${BasicBuilder.string()}`, configById: {} } },
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: { [panelType]: { extensionId, extensionName: BasicBuilder.string() } },
      }),
    );

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set([extensionId]));
  });

  it("does not include panel types not registered to any extension", () => {
    // Given
    const registeredPanelType = BasicBuilder.string();
    const unregisteredPanelType = BasicBuilder.string();
    mockGetCurrentLayoutState.mockReturnValue({
      selectedLayout: { data: { layout: `${unregisteredPanelType}!${BasicBuilder.string()}`, configById: {} } },
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: { [registeredPanelType]: { extensionId: BasicBuilder.string(), extensionName: BasicBuilder.string() } },
      }),
    );

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("returns extension IDs for all panels in a split layout", () => {
    // Given
    const panelTypeA = BasicBuilder.string();
    const panelTypeB = BasicBuilder.string();
    const extensionIdA = BasicBuilder.string();
    const extensionIdB = BasicBuilder.string();
    mockGetCurrentLayoutState.mockReturnValue({
      selectedLayout: {
        data: {
          layout: { direction: "row", first: `${panelTypeA}!1`, second: `${panelTypeB}!2` },
          configById: {},
        },
      },
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: {
          [panelTypeA]: { extensionId: extensionIdA, extensionName: BasicBuilder.string() },
          [panelTypeB]: { extensionId: extensionIdB, extensionName: BasicBuilder.string() },
        },
      }),
    );

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set([extensionIdA, extensionIdB]));
  });

  it("deduplicates the same extension used by multiple panels", () => {
    // Given
    const panelType = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockGetCurrentLayoutState.mockReturnValue({
      selectedLayout: {
        data: {
          layout: { direction: "row", first: `${panelType}!1`, second: `${panelType}!2` },
          configById: {},
        },
      },
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: {
          [panelType]: { extensionId, extensionName: BasicBuilder.string() },
        },
      }),
    );

    // When
    const { result } = renderHook(() => usePanelExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set([extensionId]));
  });
});

describe("useMessageConverterExtensionsInUse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty set when installedConverters is undefined", () => {
    // Given
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ installedMessageConverters: undefined }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ subscriptions: [], sortedTopics: [] }),
    );

    // When
    const { result } = renderHook(() => useMessageConverterExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("returns an empty set when there are no subscriptions", () => {
    // Given
    const schema = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedMessageConverters: [{ fromSchemaName: schema, extensionId }],
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ subscriptions: [], sortedTopics: [] }),
    );

    // When
    const { result } = renderHook(() => useMessageConverterExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("returns the extension ID when a subscription topic schema matches a converter", () => {
    // Given
    const schema = BasicBuilder.string();
    const topic = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedMessageConverters: [{ fromSchemaName: schema, extensionId }],
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        subscriptions: [{ topic }],
        sortedTopics: [{ name: topic, schemaName: schema }],
      }),
    );

    // When
    const { result } = renderHook(() => useMessageConverterExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set([extensionId]));
  });

  it("ignores subscriptions to topics whose schema does not match any converter", () => {
    // Given
    const topicSchema = BasicBuilder.string();
    const converterSchema = BasicBuilder.string();
    const topic = BasicBuilder.string();
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedMessageConverters: [{ fromSchemaName: converterSchema, extensionId: BasicBuilder.string() }],
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        subscriptions: [{ topic }],
        sortedTopics: [{ name: topic, schemaName: topicSchema }],
      }),
    );

    // When
    const { result } = renderHook(() => useMessageConverterExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("ignores converters without an extensionId", () => {
    // Given
    const schema = BasicBuilder.string();
    const topic = BasicBuilder.string();
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedMessageConverters: [{ fromSchemaName: schema, extensionId: undefined }],
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        subscriptions: [{ topic }],
        sortedTopics: [{ name: topic, schemaName: schema }],
      }),
    );

    // When
    const { result } = renderHook(() => useMessageConverterExtensionsInUse());

    // Then
    expect(result.current).toEqual(new Set());
  });
});

describe("useExtensionUsage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentLayoutActions.mockReturnValue({
      getCurrentLayoutState: () => ({ selectedLayout: undefined }),
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: undefined,
        installedMessageConverters: undefined,
        installedCameraModels: new Map(),
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ subscriptions: [], sortedTopics: [] }),
    );
  });

  it("returns an empty set when no extensions are in use", () => {
    // When
    const { result } = renderHook(() => useExtensionUsage());

    // Then
    expect(result.current).toEqual(new Set());
  });

  it("includes extension IDs from panel extensions", () => {
    // Given
    const panelType = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockUseCurrentLayoutActions.mockReturnValue({
      getCurrentLayoutState: () => ({
        selectedLayout: { data: { layout: `${panelType}!${BasicBuilder.string()}`, configById: {} } },
      }),
    });
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: { [panelType]: { extensionId, extensionName: BasicBuilder.string() } },
        installedMessageConverters: [],
        installedCameraModels: new Map(),
      }),
    );

    // When
    const { result } = renderHook(() => useExtensionUsage());

    // Then
    expect(result.current).toContain(extensionId);
  });

  it("includes extension IDs from message converter extensions", () => {
    // Given
    const schema = BasicBuilder.string();
    const topic = BasicBuilder.string();
    const extensionId = BasicBuilder.string();
    mockUseExtensionCatalog.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        installedPanels: {},
        installedMessageConverters: [{ fromSchemaName: schema, extensionId }],
        installedCameraModels: new Map(),
      }),
    );
    mockUseMessagePipeline.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        subscriptions: [{ topic }],
        sortedTopics: [{ name: topic, schemaName: schema }],
      }),
    );

    // When
    const { result } = renderHook(() => useExtensionUsage());

    // Then
    expect(result.current).toContain(extensionId);
  });
});
