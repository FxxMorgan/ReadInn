import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ReadInnColors {
  // Stitch Brand Palette (Warm Orange / Amber & Editorial Tones)
  static const Color primary = Color(0xFF855300); // Primary Warm Amber
  static const Color primaryLight = Color(0xFFF59E0B);
  static const Color primaryContainer = Color(0xFFFFDDB8);
  static const Color onPrimaryContainer = Color(0xFF613B00);
  
  static const Color indigoHighlight = Color(0xFF6366F1); // Tertiary accent
  static const Color accentGold = Color(0xFFF59E0B);

  // Surface & Background
  static const Color surface = Color(0xFFF7F9FB);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF2F4F6);
  static const Color surfaceContainer = Color(0xFFECEEF0);
  static const Color surfaceContainerHigh = Color(0xFFE6E8EA);
  static const Color surfaceContainerHighest = Color(0xFFE0E3E5);

  // Text & Outline
  static const Color onSurface = Color(0xFF191C1E);
  static const Color onSurfaceVariant = Color(0xFF534434);
  static const Color outline = Color(0xFF867461);
  static const Color outlineVariant = Color(0xFFD8C3AD);

  // Paper / Reader Themes
  static const Color paperWarm = Color(0xFFFBF0D9);
  static const Color paperText = Color(0xFF432818);
  
  static const Color darkBg = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkText = Color(0xFFF8FAFC);
  static const Color darkSubtext = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF334155);

  static const Color nightBg = Color(0xFF000000);
  static const Color nightText = Color(0xFFE0E0E0);

  static BoxShadow get bookShadow => BoxShadow(
        color: Colors.black.withValues(alpha: 0.12),
        blurRadius: 12,
        offset: const Offset(4, 4),
      );
}

enum ReaderThemeMode { light, sepia, dark, night }

enum ReaderFontFamily { serif, sans, mono }

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: ReadInnColors.primary,
        onPrimary: Colors.white,
        primaryContainer: ReadInnColors.primaryContainer,
        secondary: ReadInnColors.indigoHighlight,
        surface: ReadInnColors.surface,
        onSurface: ReadInnColors.onSurface,
        onSurfaceVariant: ReadInnColors.onSurfaceVariant,
        outline: ReadInnColors.outlineVariant,
      ),
      scaffoldBackgroundColor: ReadInnColors.surface,
      appBarTheme: const AppBarTheme(
        backgroundColor: ReadInnColors.surface,
        foregroundColor: ReadInnColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: ReadInnColors.surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0x33D8C3AD)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: ReadInnColors.surfaceContainerLowest,
        selectedColor: ReadInnColors.primary,
        secondarySelectedColor: ReadInnColors.primary,
        labelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: const BorderSide(color: Color(0x33D8C3AD)),
      ),
      textTheme: GoogleFonts.interTextTheme(),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: ReadInnColors.primaryLight,
        secondary: ReadInnColors.indigoHighlight,
        surface: ReadInnColors.darkSurface,
        onSurface: ReadInnColors.darkText,
      ),
      scaffoldBackgroundColor: ReadInnColors.darkBg,
      appBarTheme: const AppBarTheme(
        backgroundColor: ReadInnColors.darkSurface,
        foregroundColor: ReadInnColors.darkText,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: ReadInnColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: ReadInnColors.darkBorder),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: ReadInnColors.darkSurface,
        selectedColor: ReadInnColors.primaryLight,
        secondarySelectedColor: ReadInnColors.primaryLight,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: const BorderSide(color: ReadInnColors.darkBorder),
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    );
  }

  static TextStyle getReaderTextStyle({
    required ReaderFontFamily fontFamily,
    required double fontSize,
    required Color color,
    double lineHeight = 1.85,
  }) {
    final baseStyle = TextStyle(
      fontSize: fontSize,
      color: color,
      height: lineHeight,
    );

    switch (fontFamily) {
      case ReaderFontFamily.serif:
        return GoogleFonts.merriweather(textStyle: baseStyle);
      case ReaderFontFamily.sans:
        return GoogleFonts.inter(textStyle: baseStyle);
      case ReaderFontFamily.mono:
        return GoogleFonts.jetBrainsMono(textStyle: baseStyle);
    }
  }

  static Color getReaderBgColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.surface;
      case ReaderThemeMode.sepia:
        return ReadInnColors.paperWarm;
      case ReaderThemeMode.dark:
        return ReadInnColors.darkBg;
      case ReaderThemeMode.night:
        return ReadInnColors.nightBg;
    }
  }

  static Color getReaderTextColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.onSurface;
      case ReaderThemeMode.sepia:
        return ReadInnColors.paperText;
      case ReaderThemeMode.dark:
        return ReadInnColors.darkText;
      case ReaderThemeMode.night:
        return ReadInnColors.nightText;
    }
  }

  static Color getReaderSubtextColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.onSurfaceVariant;
      case ReaderThemeMode.sepia:
        return const Color(0xFF6F4E37);
      case ReaderThemeMode.dark:
        return ReadInnColors.darkSubtext;
      case ReaderThemeMode.night:
        return Colors.grey;
    }
  }
}
