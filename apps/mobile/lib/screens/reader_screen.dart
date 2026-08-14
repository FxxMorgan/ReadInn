import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/story.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class ReaderScreen extends ConsumerWidget {
  final String storyId;
  final String chapterId;

  const ReaderScreen({
    super.key,
    required this.storyId,
    required this.chapterId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chapterParams = (storyId: storyId, chapterId: chapterId);
    final chapterAsync = ref.watch(chapterDetailProvider(chapterParams));
    final storyDetailAsync = ref.watch(storyDetailProvider(storyId));
    final settings = ref.watch(readerSettingsProvider);
    final settingsNotifier = ref.read(readerSettingsProvider.notifier);

    final bgColor = AppTheme.getReaderBgColor(settings.themeMode);
    final textColor = AppTheme.getReaderTextColor(settings.themeMode);
    final subtextColor = AppTheme.getReaderSubtextColor(settings.themeMode);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        foregroundColor: textColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/story/$storyId'),
        ),
        title: chapterAsync.when(
          data: (chapter) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                chapter.storyTitle,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                'Capítulo ${chapter.position}: ${chapter.title}',
                style: TextStyle(
                  fontSize: 11,
                  color: subtextColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
          loading: () => const Text('Cargando...'),
          error: (err, stack) => const Text('Lector'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.bookmark_border_rounded),
            tooltip: 'Guardar marcador',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Marcador guardado en este capítulo')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Ajustes del lector',
            onPressed: () {
              _showSettingsModal(context, settings, settingsNotifier);
            },
          ),
        ],
      ),
      body: chapterAsync.when(
        data: (chapter) {
          final storyDetail = storyDetailAsync.asData?.value;
          ChapterSummary? prevChapter;
          ChapterSummary? nextChapter;

          if (storyDetail != null && storyDetail.chapters.isNotEmpty) {
            final currentIndex = storyDetail.chapters.indexWhere((c) => c.id == chapter.id);
            if (currentIndex > 0) {
              prevChapter = storyDetail.chapters[currentIndex - 1];
            }
            if (currentIndex >= 0 && currentIndex < storyDetail.chapters.length - 1) {
              nextChapter = storyDetail.chapters[currentIndex + 1];
            }
          }

          final paragraphStyle = AppTheme.getReaderTextStyle(
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            color: textColor,
          );

          return Column(
            children: [
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(vertical: 20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              chapter.title,
                              style: AppTheme.getReaderTextStyle(
                                fontFamily: settings.fontFamily,
                                fontSize: settings.fontSize * 1.4,
                                color: textColor,
                              ).copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 24),
                            // Paragraphs with Stitch inline paragraph comment buttons
                            ...List.generate(chapter.content.length, (index) {
                              final paragraph = chapter.content[index];
                              final commentCount = (index + 1) * 3 + 2; // Simulated paragraph comments

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 24.0),
                                child: Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.only(right: 36.0),
                                      child: Text(
                                        paragraph,
                                        style: paragraphStyle,
                                      ),
                                    ),
                                    // In-line speech bubble button (Stitch Feature)
                                    Positioned(
                                      right: 0,
                                      top: 0,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(12),
                                        onTap: () {
                                          _showParagraphCommentsModal(
                                              context, paragraph, commentCount, textColor, bgColor);
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: ReadInnColors.primary.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.chat_bubble_outline_rounded,
                                                size: 12,
                                                color: ReadInnColors.primary,
                                              ),
                                              const SizedBox(width: 3),
                                              Text(
                                                '$commentCount',
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: ReadInnColors.primary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                            const SizedBox(height: 32),
                            const Divider(),
                            const SizedBox(height: 16),
                            // Chapter Navigation Buttons
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                if (prevChapter != null)
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: textColor,
                                      side: BorderSide(color: subtextColor.withValues(alpha: 0.3)),
                                    ),
                                    icon: const Icon(Icons.arrow_back_ios, size: 14),
                                    label: const Text('Anterior'),
                                    onPressed: () {
                                      context.go('/story/$storyId/read/${prevChapter!.id}');
                                    },
                                  )
                                else
                                  const SizedBox.shrink(),
                                if (nextChapter != null)
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: ReadInnColors.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                    label: const Text('Siguiente'),
                                    icon: const Icon(Icons.arrow_forward_ios, size: 14),
                                    onPressed: () {
                                      context.go('/story/$storyId/read/${nextChapter!.id}');
                                    },
                                  )
                                else
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: textColor,
                                      side: BorderSide(color: subtextColor.withValues(alpha: 0.3)),
                                    ),
                                    icon: const Icon(Icons.check_circle_outline, size: 16),
                                    label: const Text('Volver a la obra'),
                                    onPressed: () {
                                      context.go('/story/$storyId');
                                    },
                                  ),
                              ],
                            ),
                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, color: textColor, size: 48),
              const SizedBox(height: 12),
              Text('Error al cargar el capítulo', style: TextStyle(color: textColor)),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.refresh(chapterDetailProvider(chapterParams)),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showParagraphCommentsModal(
    BuildContext context,
    String paragraphSnippet,
    int commentCount,
    Color textColor,
    Color bgColor,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: bgColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Comentarios del Párrafo ($commentCount)',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ReadInnColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '"${paragraphSnippet.length > 90 ? "${paragraphSnippet.substring(0, 90)}..." : paragraphSnippet}"',
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  radius: 16,
                  backgroundColor: ReadInnColors.primary,
                  child: const Text('L', style: TextStyle(color: Colors.white, fontSize: 12)),
                ),
                title: const Text('Laura M.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text(
                  '¡Esa descripción del mar me dio escalofríos! Excelente detalle.',
                  style: TextStyle(fontSize: 12),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Añadir un comentario en este párrafo...',
                  suffixIcon: const Icon(Icons.send, color: ReadInnColors.primary),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSettingsModal(
    BuildContext context,
    ReaderSettings settings,
    ReaderSettingsNotifier notifier,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.getReaderBgColor(settings.themeMode),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Consumer(
          builder: (context, ref, _) {
            final currentSettings = ref.watch(readerSettingsProvider);
            final textColor = AppTheme.getReaderTextColor(currentSettings.themeMode);
            final subtextColor = AppTheme.getReaderSubtextColor(currentSettings.themeMode);

            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Personalizar Lector',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('Tema visual', style: TextStyle(fontSize: 14, color: subtextColor)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _themeChip(
                        label: 'Claro',
                        bgColor: ReadInnColors.surface,
                        textColor: ReadInnColors.onSurface,
                        isSelected: currentSettings.themeMode == ReaderThemeMode.light,
                        onTap: () => notifier.setThemeMode(ReaderThemeMode.light),
                      ),
                      _themeChip(
                        label: 'Sepia',
                        bgColor: ReadInnColors.paperWarm,
                        textColor: ReadInnColors.paperText,
                        isSelected: currentSettings.themeMode == ReaderThemeMode.sepia,
                        onTap: () => notifier.setThemeMode(ReaderThemeMode.sepia),
                      ),
                      _themeChip(
                        label: 'Oscuro',
                        bgColor: ReadInnColors.darkBg,
                        textColor: ReadInnColors.darkText,
                        isSelected: currentSettings.themeMode == ReaderThemeMode.dark,
                        onTap: () => notifier.setThemeMode(ReaderThemeMode.dark),
                      ),
                      _themeChip(
                        label: 'Noche',
                        bgColor: ReadInnColors.nightBg,
                        textColor: ReadInnColors.nightText,
                        isSelected: currentSettings.themeMode == ReaderThemeMode.night,
                        onTap: () => notifier.setThemeMode(ReaderThemeMode.night),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Tamaño de letra', style: TextStyle(fontSize: 14, color: subtextColor)),
                      Text('${currentSettings.fontSize.toInt()} pt',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor)),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(Icons.remove, color: textColor),
                        onPressed: () => notifier.setFontSize(currentSettings.fontSize - 1),
                      ),
                      Expanded(
                        child: Slider(
                          value: currentSettings.fontSize,
                          min: 14,
                          max: 28,
                          divisions: 14,
                          activeColor: ReadInnColors.primary,
                          onChanged: (val) => notifier.setFontSize(val),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.add, color: textColor),
                        onPressed: () => notifier.setFontSize(currentSettings.fontSize + 1),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('Tipografía', style: TextStyle(fontSize: 14, color: subtextColor)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      ChoiceChip(
                        label: const Text('Serif'),
                        selected: currentSettings.fontFamily == ReaderFontFamily.serif,
                        onSelected: (_) => notifier.setFontFamily(ReaderFontFamily.serif),
                      ),
                      ChoiceChip(
                        label: const Text('Sans-Serif'),
                        selected: currentSettings.fontFamily == ReaderFontFamily.sans,
                        onSelected: (_) => notifier.setFontFamily(ReaderFontFamily.sans),
                      ),
                      ChoiceChip(
                        label: const Text('Monospace'),
                        selected: currentSettings.fontFamily == ReaderFontFamily.mono,
                        onSelected: (_) => notifier.setFontFamily(ReaderFontFamily.mono),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _themeChip({
    required String label,
    required Color bgColor,
    required Color textColor,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? ReadInnColors.primary : Colors.grey.withValues(alpha: 0.3),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: textColor,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
