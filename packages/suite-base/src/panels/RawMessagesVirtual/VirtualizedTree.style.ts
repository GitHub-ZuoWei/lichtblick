// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

import { JSON_TREE_THEME_COLORS } from "@lichtblick/suite-base/util/constants";
import { expandAllButtonStyles } from "@lichtblick/suite-base/panels/RawMessagesCommon/index.style";
import { customTypography } from "@lichtblick/theme";

export const useStyles = makeStyles<void, "expandAllButton">()((theme, _params, classes) => {
  // Use the same color scheme as useJsonTreeTheme for consistency with RawMessages
  const colors = JSON_TREE_THEME_COLORS[theme.palette.mode];

  return {
    container: {
      overflow: "auto",
      contain: "strict",
      height: "100%",
      width: "100%",
    },
    innerWrapper: {
      width: "100%",
      position: "relative",
    },
    row: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      padding: "2px 0",
      fontFamily: theme.typography.body1.fontFamily,
      fontFeatureSettings: `${customTypography.fontFeatureSettings}, "zero"`,
      fontSize: "inherit",
      lineHeight: 1.4,
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      [`&:hover .${classes.expandAllButton}`]: {
        opacity: 0.6,
        pointerEvents: "auto",
      },
      [`&:hover .${classes.expandAllButton}:hover`]: {
        opacity: 1,
      },
    },
    expandButton: {
      cursor: "pointer",
      userSelect: "none",
      minWidth: 12,
      marginRight: theme.spacing(0.5),
      color: colors.label,
      fontSize: theme.typography.pxToRem(11),
      alignSelf: "center",
    },
    spanButton: {
      cursor: "pointer",
      userSelect: "none",
      background: "none",
      border: "none",
      padding: 0,
      font: "inherit",
      textAlign: "left",
      color: "inherit",
    },
    key: {
      color: colors.label,
      marginRight: theme.spacing(0.5),
    },
    valueContainer: {
      flex: "1 1 auto",
      minWidth: 0,
      overflow: "visible",
      wordBreak: "break-all",
      overflowWrap: "anywhere",
    },
    value: {
      color: colors.text,
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    string: {
      color: colors.string,
    },
    number: {
      color: colors.number,
    },
    boolean: {
      color: colors.number,
    },
    null: {
      color: colors.null,
    },
    objectLabel: {
      color: theme.palette.text.secondary,
      fontStyle: "italic",
    },
    expandAllButton: expandAllButtonStyles(theme),
  };
});
