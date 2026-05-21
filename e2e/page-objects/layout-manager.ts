// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Locator, Page } from "playwright";

export class LayoutManager {
  public constructor(private readonly page: Page) {}

  public async openDefaultLayout(): Promise<void> {
    await this.page.getByTestId("layout-list-item").getByText("Default", { exact: true }).click();
  }

  public async createNewLayout(): Promise<void> {
    await this.page.getByText("Create new layout").click();
  }

  public async selectLayout(name: string): Promise<void> {
    await this.page.getByTestId("layout-list-item").getByText(name, { exact: true }).click();
  }

  public async selectPanel(panelName: string): Promise<void> {
    await this.page.getByTestId(`panel-grid-card ${panelName}`).click();
  }

  public async importLayout(): Promise<void> {
    await this.page.getByRole("button", { name: "Import from file…" }).click();
  }

  public async revertLayout(): Promise<void> {
    await this.page.getByTestId("unsaved-changes-icon").click();
    await this.page.getByRole("menuitem", { name: "Revert" }).click();
  }

  public async addTab(): Promise<void> {
    await this.page.getByTestId("add-tab").click();
  }

  public getLayoutListItem(): Locator {
    return this.page.getByTestId("layout-list-item");
  }

  public getCreateNewLayoutButton(): Locator {
    return this.page.getByTestId("create-new-layout");
  }
}
