import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class CreateStoryDialog extends ConsumerStatefulWidget {
  const CreateStoryDialog({super.key});

  static Future<StorySummary?> show(BuildContext context) {
    return showDialog<StorySummary>(
      context: context,
      builder: (context) => const Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: CreateStoryDialog(),
      ),
    );
  }

  @override
  ConsumerState<CreateStoryDialog> createState() => _CreateStoryDialogState();
}

class _CreateStoryDialogState extends ConsumerState<CreateStoryDialog> {
  final _titleController = TextEditingController();
  final _synopsisController = TextEditingController();
  final _imagePicker = ImagePicker();
  String _selectedGenre = 'Misterio';
  XFile? _coverFile;
  Uint8List? _coverBytes;
  String? _coverMimeType;
  bool _isMature = false;
  bool _isLoading = false;

  static const genres = [
    'Misterio',
    'Ciencia ficción',
    'Fantasía',
    'Romance',
    'Terror',
    'Drama',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _synopsisController.dispose();
    super.dispose();
  }

  String? _mimeTypeFor(XFile file) {
    final reported = file.mimeType;
    if (reported != null &&
        const {
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        }.contains(reported)) {
      return reported;
    }
    final extension = file.name.split('.').last.toLowerCase();
    return switch (extension) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      'gif' => 'image/gif',
      _ => null,
    };
  }

  Future<void> _pickCover() async {
    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1800,
      imageQuality: 90,
    );
    if (picked == null) return;
    final mimeType = _mimeTypeFor(picked);
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    if (mimeType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('La portada debe ser JPG, PNG, WebP o GIF.'),
        ),
      );
      return;
    }
    if (bytes.length > 5 * 1024 * 1024) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La portada no puede pesar más de 5 MB.')),
      );
      return;
    }
    setState(() {
      _coverFile = picked;
      _coverBytes = bytes;
      _coverMimeType = mimeType;
    });
  }

  Future<void> _createStory() async {
    final title = _titleController.text.trim();
    final synopsis = _synopsisController.text.trim();
    if (title.length < 2 || synopsis.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'El título necesita 2 caracteres y la sinopsis al menos 10.',
          ),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final auth = ref.read(authProvider);
      final api = ref.read(apiServiceProvider);
      String? coverUrl;
      if (_coverFile != null && _coverBytes != null && _coverMimeType != null) {
        coverUrl = await api.uploadMedia(
          bytes: _coverBytes!,
          filename: _coverFile!.name,
          mimeType: _coverMimeType!,
          purpose: 'cover',
          token: auth.token,
        );
      }
      final createdStory = await api.createStory(
        title: title,
        synopsis: synopsis,
        genre: _selectedGenre,
        isMature: _isMature,
        authorName: auth.user?.displayName ?? 'Invitado',
        authorUsername: auth.user?.username ?? 'invitado',
        coverUrl: coverUrl,
        token: auth.token,
      );

      if (mounted) {
        ref.invalidate(storiesProvider);
        ref.invalidate(writerStoriesProvider);
        Navigator.pop(context, createdStory);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      var message =
          'No pudimos publicar la obra. Revisa tu conexión e inténtalo otra vez.';
      if (error is DioException) {
        final payload = error.response?.data;
        if (payload is Map && payload['error'] is Map) {
          final apiMessage = payload['error']['message'];
          if (apiMessage is String && apiMessage.isNotEmpty) {
            message = apiMessage;
          }
        }
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: 480,
        maxHeight: MediaQuery.sizeOf(context).height * 0.86,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Crear Nueva Obra',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _isLoading ? null : () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                InkWell(
                  onTap: _isLoading ? null : _pickCover,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 92,
                    height: 138,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: ReadInnColors.softOrange,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ReadInnColors.border),
                    ),
                    child: _coverBytes == null
                        ? const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_photo_alternate_outlined,
                                size: 32,
                              ),
                              SizedBox(height: 7),
                              Text(
                                'Portada',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          )
                        : Image.memory(_coverBytes!, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Imagen de portada',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'JPG, PNG, WebP o GIF de hasta 5 MB.',
                        style: TextStyle(
                          color: ReadInnColors.muted,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 9),
                      Wrap(
                        spacing: 6,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _isLoading ? null : _pickCover,
                            icon: const Icon(Icons.photo_library_outlined),
                            label: Text(
                              _coverFile == null ? 'Elegir' : 'Cambiar',
                            ),
                          ),
                          if (_coverFile != null)
                            IconButton(
                              tooltip: 'Quitar portada',
                              onPressed: _isLoading
                                  ? null
                                  : () => setState(() {
                                      _coverFile = null;
                                      _coverBytes = null;
                                      _coverMimeType = null;
                                    }),
                              icon: const Icon(Icons.delete_outline),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              enabled: !_isLoading,
              decoration: const InputDecoration(
                labelText: 'Título de la obra',
                hintText: 'Ej: El misterio de la marisma',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _synopsisController,
              enabled: !_isLoading,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Sinopsis / Resumen',
                hintText: 'Describe brevemente de qué trata tu historia...',
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedGenre,
                    decoration: const InputDecoration(labelText: 'Género'),
                    items: genres
                        .map(
                          (genre) => DropdownMenuItem(
                            value: genre,
                            child: Text(genre),
                          ),
                        )
                        .toList(),
                    onChanged: _isLoading
                        ? null
                        : (value) {
                            if (value != null) {
                              setState(() => _selectedGenre = value);
                            }
                          },
                  ),
                ),
                const SizedBox(width: 16),
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Checkbox(
                        value: _isMature,
                        activeColor: ReadInnColors.primary,
                        onChanged: _isLoading
                            ? null
                            : (value) {
                                setState(() => _isMature = value ?? false);
                              },
                      ),
                      const Flexible(
                        child: Text(
                          'Contenido +18',
                          style: TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: ReadInnColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                onPressed: _isLoading ? null : _createStory,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Publicar Obra',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
