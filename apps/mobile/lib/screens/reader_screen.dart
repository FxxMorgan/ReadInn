import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  final String storyId;
  final String chapterId;

  const ReaderScreen({
    super.key,
    required this.storyId,
    required this.chapterId,
  });

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  bool _recordedOpen = false;
  DateTime? _openedAt;

  @override
  void initState() {
    super.initState();
    _openedAt = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) => _recordChapterOpen());
  }

  Future<void> _recordChapterOpen({bool completed = false}) async {
    final shouldRecordOpen = !_recordedOpen;
    if (_recordedOpen && !completed) return;
    _recordedOpen = true;
    try {
      final story = await ref.read(storyDetailProvider(widget.storyId).future);
      final auth = ref.read(authProvider);
      final previous = await ref.read(
        readingProgressProvider(widget.storyId).future,
      );
      final index = story.chapters.indexWhere(
        (chapter) => chapter.id == widget.chapterId,
      );
      if (index < 0) return;
      final seen = <String>{...?previous?.seenChapterIds, widget.chapterId};
      final percentage = story.chapters.isEmpty
          ? 0.0
          : ((index + 1) / story.chapters.length * 100)
                .clamp(0, 100)
                .toDouble();
      await ref
          .read(apiServiceProvider)
          .saveReadingProgress(
            storyId: widget.storyId,
            chapterId: widget.chapterId,
            progressPercentage: percentage,
            token: auth.token,
            isCompleted:
                completed ||
                (index == story.chapters.length - 1 &&
                    previous?.isCompleted == true),
            seenChapterIds: seen.toList(),
          );
      final api = ref.read(apiServiceProvider);
      if (shouldRecordOpen) {
        await api.recordAnalyticsEvent(
          eventType: 'chapter_opened',
          storyId: widget.storyId,
          chapterId: widget.chapterId,
          token: auth.token,
        );
      }
      if (completed) {
        await api.recordAnalyticsEvent(
          eventType: 'chapter_completed',
          storyId: widget.storyId,
          chapterId: widget.chapterId,
          token: auth.token,
        );
      }
      ref.invalidate(readingProgressProvider(widget.storyId));
    } catch (_) {
      _recordedOpen = false;
    }
  }

  @override
  void dispose() {
    final openedAt = _openedAt;
    if (openedAt != null) {
      final seconds = DateTime.now().difference(openedAt).inSeconds;
      if (seconds > 0) {
        final auth = ref.read(authProvider);
        unawaited(
          ref
              .read(apiServiceProvider)
              .recordAnalyticsEvent(
                eventType: 'reading_heartbeat',
                storyId: widget.storyId,
                chapterId: widget.chapterId,
                activeSeconds: seconds.clamp(1, 3600).toInt(),
                token: auth.token,
              ),
        );
      }
    }
    super.dispose();
  }

  void _openSettings() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => const _ReaderSettingsSheet(),
    );
  }

  void _openInlineComments(int paragraphIndex) {
    final settings = ref.read(readerSettingsProvider);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppTheme.getReaderBgColor(settings.themeMode),
      builder: (_) => _InlineCommentsSheet(
        storyId: widget.storyId,
        chapterId: widget.chapterId,
        paragraphIndex: paragraphIndex,
      ),
    );
  }

  Future<void> _handleMenu(String value, bool isLastChapter) async {
    if (value == 'mark') {
      await _recordChapterOpen(completed: isLastChapter);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Capítulo marcado como leído.')),
        );
      }
      return;
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enlace del capítulo listo para compartir.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final storyId = widget.storyId;
    final chapterId = widget.chapterId;
    final chapterAsync = ref.watch(
      chapterDetailProvider((storyId: storyId, chapterId: chapterId)),
    );
    final storyAsync = ref.watch(storyDetailProvider(storyId));
    final commentsAsync = ref.watch(
      chapterCommentsProvider((storyId: storyId, chapterId: chapterId)),
    );
    final engagementAsync = ref.watch(storyEngagementProvider(storyId));
    final auth = ref.watch(authProvider);
    final settings = ref.watch(readerSettingsProvider);
    final background = AppTheme.getReaderBgColor(settings.themeMode);
    final textColor = AppTheme.getReaderTextColor(settings.themeMode);
    final subtextColor = AppTheme.getReaderSubtextColor(settings.themeMode);
    final story = storyAsync.valueOrNull;
    final currentIndex =
        story?.chapters.indexWhere((chapter) => chapter.id == chapterId) ?? -1;
    final nextChapter =
        story != null &&
            currentIndex >= 0 &&
            currentIndex + 1 < story.chapters.length
        ? story.chapters[currentIndex + 1]
        : null;
    final progress = story == null || story.chapters.isEmpty || currentIndex < 0
        ? 0.0
        : (currentIndex + 1) / story.chapters.length;
    final engagement = engagementAsync.valueOrNull ?? const StoryEngagement();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: background,
        foregroundColor: textColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/story/$storyId'),
        ),
        title: const Text(
          'Lectura',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        actions: [
          IconButton(
            tooltip: 'Ajustes de lectura',
            icon: const Icon(Icons.text_fields_rounded),
            onPressed: _openSettings,
          ),
          PopupMenuButton<String>(
            tooltip: 'Más opciones',
            icon: const Icon(Icons.more_horiz_rounded),
            onSelected: (value) => _handleMenu(value, nextChapter == null),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'mark', child: Text('Marcar como leído')),
              PopupMenuItem(value: 'share', child: Text('Compartir capítulo')),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(3),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 3,
            backgroundColor: Colors.transparent,
            color: ReadInnColors.primary,
          ),
        ),
      ),
      body: chapterAsync.when(
        loading: () =>
            Center(child: CircularProgressIndicator(color: textColor)),
        error: (error, _) => Center(
          child: Text(
            'No pudimos cargar el capítulo: $error',
            style: TextStyle(color: textColor),
          ),
        ),
        data: (chapter) {
          final allComments =
              commentsAsync.valueOrNull ?? const <ChapterComment>[];
          final generalComments = allComments
              .where((comment) => comment.paragraphIndex == null)
              .toList();
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 42),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      chapter.storyTitle.toUpperCase(),
                      style: TextStyle(
                        color: subtextColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Capítulo ${chapter.position}:\n${chapter.title}',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 30,
                        height: 1.12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '14 min de lectura',
                      style: TextStyle(color: subtextColor, fontSize: 12),
                    ),
                    const SizedBox(height: 30),
                    ...chapter.content.asMap().entries.map((entry) {
                      final inlineCount = allComments
                          .where(
                            (comment) => comment.paragraphIndex == entry.key,
                          )
                          .length;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              entry.value,
                              style: AppTheme.getReaderTextStyle(
                                fontFamily: settings.fontFamily,
                                fontSize: settings.fontSize,
                                color: textColor,
                              ),
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                onPressed: () => _openInlineComments(entry.key),
                                icon: Icon(
                                  inlineCount > 0
                                      ? Icons.mode_comment_rounded
                                      : Icons.add_comment_outlined,
                                  size: 17,
                                ),
                                label: Text(
                                  inlineCount > 0 ? '$inlineCount' : 'Comentar',
                                ),
                                style: TextButton.styleFrom(
                                  foregroundColor: subtextColor,
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    Divider(color: subtextColor.withValues(alpha: 0.25)),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final liked = await ref
                                  .read(apiServiceProvider)
                                  .toggleStoryLike(storyId, token: auth.token);
                              ref.invalidate(storyEngagementProvider(storyId));
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      liked
                                          ? 'Te gusta esta obra.'
                                          : 'Quitaste tu me gusta.',
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: Icon(
                              engagement.liked
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: engagement.liked
                                  ? const Color(0xFFDC2626)
                                  : null,
                            ),
                            label: Text(
                              engagement.liked ? 'Te gusta' : 'Me gusta',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final saved = await ref
                                  .read(apiServiceProvider)
                                  .toggleLibrary(storyId, token: auth.token);
                              ref.invalidate(libraryProvider);
                              ref.invalidate(storyEngagementProvider(storyId));
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      saved
                                          ? 'Guardado en tu biblioteca.'
                                          : 'Quitado de tu biblioteca.',
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: Icon(
                              engagement.saved
                                  ? Icons.bookmark_rounded
                                  : Icons.bookmark_border_rounded,
                            ),
                            label: Text(
                              engagement.saved ? 'Guardado' : 'Guardar',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: nextChapter == null
                            ? null
                            : () => context.pushReplacement(
                                '/story/$storyId/read/${nextChapter.id}',
                              ),
                        icon: Icon(
                          nextChapter == null
                              ? Icons.block_rounded
                              : Icons.arrow_forward_rounded,
                        ),
                        label: Text(
                          nextChapter == null
                              ? 'No hay capítulo disponible'
                              : 'Siguiente capítulo',
                        ),
                      ),
                    ),
                    const SizedBox(height: 34),
                    Text(
                      'Comentarios generales',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Para comentar una frase concreta, usa el icono junto al párrafo.',
                      style: TextStyle(color: subtextColor, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    _CommentComposer(
                      textColor: textColor,
                      subtextColor: subtextColor,
                      hintText: 'Comentar el capítulo',
                      onSubmit: (body) async {
                        await ref
                            .read(apiServiceProvider)
                            .addComment(
                              storyId: storyId,
                              chapterId: chapterId,
                              body: body,
                              authorName: auth.user?.displayName ?? 'Invitado',
                              token: auth.token,
                            );
                        ref.invalidate(
                          chapterCommentsProvider((
                            storyId: storyId,
                            chapterId: chapterId,
                          )),
                        );
                        ref.invalidate(storyEngagementProvider(storyId));
                      },
                    ),
                    const SizedBox(height: 18),
                    commentsAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (error, _) => Text(
                        'No pudimos cargar los comentarios: $error',
                        style: TextStyle(color: subtextColor),
                      ),
                      data: (_) => generalComments.isEmpty
                          ? Text(
                              'Todavía no hay comentarios generales.',
                              style: TextStyle(color: subtextColor),
                            )
                          : Column(
                              children: generalComments
                                  .map(
                                    (comment) => _Comment(
                                      comment: comment,
                                      textColor: textColor,
                                      subtextColor: subtextColor,
                                    ),
                                  )
                                  .toList(),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _InlineCommentsSheet extends ConsumerWidget {
  final String storyId;
  final String chapterId;
  final int paragraphIndex;

  const _InlineCommentsSheet({
    required this.storyId,
    required this.chapterId,
    required this.paragraphIndex,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final commentsAsync = ref.watch(
      chapterCommentsProvider((storyId: storyId, chapterId: chapterId)),
    );
    final auth = ref.watch(authProvider);
    final settings = ref.watch(readerSettingsProvider);
    final textColor = AppTheme.getReaderTextColor(settings.themeMode);
    final subtextColor = AppTheme.getReaderSubtextColor(settings.themeMode);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          18,
          0,
          18,
          18 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.68,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Comentarios del párrafo',
                style: TextStyle(
                  color: textColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: commentsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No pudimos cargar el hilo: $error',
                      style: TextStyle(color: subtextColor),
                    ),
                  ),
                  data: (comments) {
                    final thread = comments
                        .where(
                          (comment) => comment.paragraphIndex == paragraphIndex,
                        )
                        .toList();
                    if (thread.isEmpty) {
                      return Center(
                        child: Text(
                          'Sé el primero en comentar este párrafo.',
                          style: TextStyle(color: subtextColor),
                        ),
                      );
                    }
                    return ListView(
                      children: thread
                          .map(
                            (comment) => _Comment(
                              comment: comment,
                              textColor: textColor,
                              subtextColor: subtextColor,
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
              _CommentComposer(
                textColor: textColor,
                subtextColor: subtextColor,
                hintText: 'Responder a este párrafo',
                onSubmit: (body) async {
                  await ref
                      .read(apiServiceProvider)
                      .addComment(
                        storyId: storyId,
                        chapterId: chapterId,
                        body: body,
                        paragraphIndex: paragraphIndex,
                        authorName: auth.user?.displayName ?? 'Invitado',
                        token: auth.token,
                      );
                  ref.invalidate(
                    chapterCommentsProvider((
                      storyId: storyId,
                      chapterId: chapterId,
                    )),
                  );
                  ref.invalidate(storyEngagementProvider(storyId));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommentComposer extends StatefulWidget {
  final Color textColor;
  final Color subtextColor;
  final String hintText;
  final Future<void> Function(String body) onSubmit;

  const _CommentComposer({
    required this.textColor,
    required this.subtextColor,
    required this.hintText,
    required this.onSubmit,
  });

  @override
  State<_CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends State<_CommentComposer> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.onSubmit(body);
      _controller.clear();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: widget.textColor.withValues(alpha: 0.04),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: widget.subtextColor.withValues(alpha: 0.2)),
    ),
    child: Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            style: TextStyle(color: widget.textColor),
            textInputAction: TextInputAction.send,
            minLines: 1,
            maxLines: 4,
            onSubmitted: (_) => _send(),
            decoration: InputDecoration.collapsed(
              hintText: widget.hintText,
              hintStyle: TextStyle(color: widget.subtextColor),
            ),
          ),
        ),
        IconButton(
          tooltip: 'Publicar comentario',
          onPressed: _sending ? null : _send,
          icon: _sending
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(
                  Icons.send_rounded,
                  color: ReadInnColors.primaryDeep,
                ),
        ),
      ],
    ),
  );
}

class _Comment extends StatelessWidget {
  final ChapterComment comment;
  final Color textColor;
  final Color subtextColor;

  const _Comment({
    required this.comment,
    required this.textColor,
    required this.subtextColor,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 17,
          backgroundColor: ReadInnColors.softOrange,
          child: Text(
            comment.authorName.isEmpty
                ? '?'
                : comment.authorName.substring(0, 1).toUpperCase(),
            style: TextStyle(color: textColor, fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                comment.authorName,
                style: TextStyle(color: textColor, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                comment.body,
                style: TextStyle(color: textColor, height: 1.45),
              ),
              if (comment.likes > 0) ...[
                const SizedBox(height: 5),
                Text(
                  '${comment.likes} me gusta',
                  style: TextStyle(color: subtextColor, fontSize: 11),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}

class _ReaderSettingsSheet extends ConsumerWidget {
  const _ReaderSettingsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(readerSettingsProvider);
    final notifier = ref.read(readerSettingsProvider.notifier);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ajustes de lectura',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 20),
            const Text('Tamaño', style: TextStyle(fontWeight: FontWeight.w700)),
            Row(
              children: [
                IconButton.outlined(
                  onPressed: () => notifier.setFontSize(settings.fontSize - 1),
                  icon: const Icon(Icons.remove),
                ),
                Expanded(
                  child: Slider(
                    value: settings.fontSize,
                    min: 14,
                    max: 28,
                    divisions: 14,
                    label: settings.fontSize.round().toString(),
                    onChanged: notifier.setFontSize,
                  ),
                ),
                IconButton.outlined(
                  onPressed: () => notifier.setFontSize(settings.fontSize + 1),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Tipografía',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            SegmentedButton<ReaderFontFamily>(
              segments: const [
                ButtonSegment(
                  value: ReaderFontFamily.serif,
                  label: Text('Serif'),
                ),
                ButtonSegment(
                  value: ReaderFontFamily.sans,
                  label: Text('Sans'),
                ),
                ButtonSegment(
                  value: ReaderFontFamily.mono,
                  label: Text('Mono'),
                ),
              ],
              selected: {settings.fontFamily},
              onSelectionChanged: (selection) =>
                  notifier.setFontFamily(selection.first),
            ),
            const SizedBox(height: 20),
            const Text('Tema', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              children: ReaderThemeMode.values.map((mode) {
                final selected = settings.themeMode == mode;
                return InkWell(
                  onTap: () => notifier.setThemeMode(mode),
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.getReaderBgColor(mode),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected
                            ? ReadInnColors.primaryDeep
                            : ReadInnColors.border,
                        width: selected ? 3 : 1,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
