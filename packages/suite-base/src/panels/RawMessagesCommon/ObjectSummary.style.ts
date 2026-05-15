// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

import { JSON_TREE_THEME_COLORS } from "@lichtblick/suite-base/util/constants";

export const useStyles = makeStyles()((theme) => ({
  summary: {
    color: JSON_TREE_THEME_COLORS[theme.palette.mode].string,
    paddingLeft: "0.5em",
    "[data-expanded] &": {
      color: theme.palette.text.secondary,
    },
  },
}));
