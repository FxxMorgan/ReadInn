import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ReadInnColors {
  static const primary = Color(0xFFF97316);
  static const primaryDeep = Color(0xFFC2410C);
  static const indigo = primaryDeep;
  static const ink = Color(0xFF1C1917);
  static const muted = Color(0xFF78716C);
  static const onSurfaceVariant = muted;
  static const background = Color(0xFFFFFDFC);
  static const surface = Colors.white;
  static const border = Color(0xFFE7E5E4);
  static const softOrange = Color(0xFFFFEDD5);
  static const softIndigo = softOrange;
  static const paperWarm = Color(0xFFFFF7ED);
  static const paperText = Color(0xFF432818);
  static const darkBg = Color(0xFF0F172A);
  static const darkSurface = Color(0xFF1E293B);
  static const darkText = Color(0xFFF8FAFC);
  static const darkMuted = Color(0xFF94A3B8);

  static BoxShadow get bookShadow => BoxShadow(
    color: const Color(0xFF0F172A).withValues(alpha: 0.16),
    blurRadius: 16,
    offset: const Offset(0, 8),
  );
}

enum ReaderThemeMode { light, sepia, dark, night }

enum ReaderFontFamily { serif, lora, baskerville, sans, accessible, mono }

class AppTheme {
  static ThemeData get lightTheme {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: ReadInnColors.primary,
          brightness: Brightness.light,
          surface: ReadInnColors.background,
        ).copyWith(
          primary: ReadInnColors.primaryDeep,
          onPrimary: Colors.white,
          secondary: ReadInnColors.primary,
          onSecondary: Colors.white,
          surface: ReadInnColors.background,
          onSurface: ReadInnColors.ink,
          outline: ReadInnColors.border,
        );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      scaffoldBackgroundColor: ReadInnColors.background,
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: ReadInnColors.ink,
        displayColor: ReadInnColors.ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: ReadInnColors.surface,
        foregroundColor: ReadInnColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: ReadInnColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: ReadInnColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ReadInnColors.surface,
        hintStyle: const TextStyle(color: ReadInnColors.muted),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ReadInnColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: ReadInnColors.border),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          borderSide: BorderSide(color: ReadInnColors.primaryDeep, width: 1.5),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFF5F5F4),
        selectedColor: ReadInnColors.primaryDeep,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        secondaryLabelStyle: const TextStyle(color: Colors.white),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: BorderSide.none,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: ReadInnColors.surface,
        indicatorColor: ReadInnColors.softOrange,
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: ReadInnColors.border,
        space: 1,
      ),
    );
  }

  static ThemeData get darkTheme {
    final scheme = ColorScheme.fromSeed(
      seedColor: ReadInnColors.primary,
      brightness: Brightness.dark,
    ).copyWith(primary: ReadInnColors.primary, secondary: ReadInnColors.indigo);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: ReadInnColors.darkBg,
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      appBarTheme: const AppBarTheme(
        backgroundColor: ReadInnColors.darkBg,
        foregroundColor: ReadInnColors.darkText,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: ReadInnColors.darkSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
      ),
    );
  }

  static TextStyle getReaderTextStyle({
    required ReaderFontFamily fontFamily,
    required double fontSize,
    required Color color,
    double lineHeight = 1.8,
  }) {
    final base = TextStyle(
      fontSize: fontSize,
      color: color,
      height: lineHeight,
    );
    switch (fontFamily) {
      case ReaderFontFamily.serif:
        return GoogleFonts.merriweather(textStyle: base);
      case ReaderFontFamily.lora:
        return GoogleFonts.lora(textStyle: base);
      case ReaderFontFamily.baskerville:
        return GoogleFonts.libreBaskerville(textStyle: base);
      case ReaderFontFamily.sans:
        return GoogleFonts.sourceSans3(textStyle: base);
      case ReaderFontFamily.accessible:
        return GoogleFonts.atkinsonHyperlegible(textStyle: base);
      case ReaderFontFamily.mono:
        return GoogleFonts.jetBrainsMono(textStyle: base);
    }
  }

  static Color getReaderBgColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.background;
      case ReaderThemeMode.sepia:
        return ReadInnColors.paperWarm;
      case ReaderThemeMode.dark:
        return ReadInnColors.darkBg;
      case ReaderThemeMode.night:
        return Colors.black;
    }
  }

  static Color getReaderTextColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.ink;
      case ReaderThemeMode.sepia:
        return ReadInnColors.paperText;
      case ReaderThemeMode.dark:
      case ReaderThemeMode.night:
        return ReadInnColors.darkText;
    }
  }

  static Color getReaderSubtextColor(ReaderThemeMode mode) {
    switch (mode) {
      case ReaderThemeMode.light:
        return ReadInnColors.muted;
      case ReaderThemeMode.sepia:
        return const Color(0xFF7A5638);
      case ReaderThemeMode.dark:
      case ReaderThemeMode.night:
        return ReadInnColors.darkMuted;
    }
  }
}
