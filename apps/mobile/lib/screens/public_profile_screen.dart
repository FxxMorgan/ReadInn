import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';

class PublicProfileScreen extends ConsumerStatefulWidget {
  final String username;

  const PublicProfileScreen({super.key, required this.username});

  @override
  ConsumerState<PublicProfileScreen> createState() =>
      _PublicProfileScreenState();
}

class _PublicProfileScreenState extends ConsumerState<PublicProfileScreen> {
  final _wallController = TextEditingController();
  bool _posting = false;

  @override
  void dispose() {
    _wallController.dispose();
    super.dispose();
  }

  Future<void> _toggleFollow(PublicProfile profile) async {
    final auth = ref.read(authProvider);
    if (auth.token == null) {
      AuthDialog.show(context);
      return;
    }
    await ref
        .read(apiServiceProvider)
        .toggleFollow(profile.username, token: auth.token!);
    ref.invalidate(publicProfileProvider(profile.username));
  }

  Future<void> _post(PublicProfile profile) async {
    final body = _wallController.text.trim();
    final token = ref.read(authProvider).token;
    if (token == null) {
      AuthDialog.show(context);
      return;
    }
    if (body.isEmpty || _posting) return;
    setState(() => _posting = true);
    try {
      await ref
          .read(apiServiceProvider)
          .postToProfileWall(
            username: profile.username,
            body: body,
            token: token,
          );
      _wallController.clear();
      ref.invalidate(profileWallProvider(profile.username));
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(publicProfileProvider(widget.username));
    final wallAsync = ref.watch(profileWallProvider(widget.username));
    final auth = ref.watch(authProvider);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        title: Text('@${widget.username}'),
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('No pudimos cargar el perfil: $error')),
        data: (profile) {
          final ownProfile = auth.user?.username == profile.username;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 40),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 42,
                    backgroundColor: ReadInnColors.softOrange,
                    foregroundImage: profile.avatarUrl == null
                        ? null
                        : NetworkImage(profile.avatarUrl!),
                    child: profile.avatarUrl == null
                        ? Text(
                            profile.displayName.substring(0, 1).toUpperCase(),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          profile.displayName,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '@${profile.username}',
                          style: const TextStyle(color: ReadInnColors.muted),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          profile.bio.isEmpty ? 'Sin biografia.' : profile.bio,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _ProfileCount(
                      value: profile.followerCount,
                      label: 'Seguidores',
                    ),
                  ),
                  Expanded(
                    child: _ProfileCount(
                      value: profile.followingCount,
                      label: 'Siguiendo',
                    ),
                  ),
                  Expanded(
                    child: _ProfileCount(
                      value: profile.stories.length,
                      label: 'Obras',
                    ),
                  ),
                ],
              ),
              if (!ownProfile) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: profile.isFollowing
                      ? OutlinedButton.icon(
                          onPressed: () => _toggleFollow(profile),
                          icon: const Icon(Icons.person_remove_outlined),
                          label: const Text('Siguiendo'),
                        )
                      : FilledButton.icon(
                          onPressed: () => _toggleFollow(profile),
                          icon: const Icon(Icons.person_add_outlined),
                          label: const Text('Seguir'),
                        ),
                ),
              ],
              const SizedBox(height: 30),
              const SectionHeader(title: 'Obras publicadas'),
              const SizedBox(height: 12),
              if (profile.stories.isEmpty)
                const Text(
                  'Este usuario aun no ha publicado obras.',
                  style: TextStyle(color: ReadInnColors.muted),
                )
              else
                ...profile.stories.map((story) => _StoryRow(story: story)),
              const SizedBox(height: 30),
              const SectionHeader(title: 'Muro'),
              const SizedBox(height: 12),
              if (auth.isAuthenticated)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _wallController,
                        minLines: 2,
                        maxLines: 5,
                        maxLength: 1000,
                        decoration: InputDecoration(
                          hintText:
                              'Escribir en el muro de ${profile.displayName}',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      tooltip: 'Publicar mensaje',
                      onPressed: _posting ? null : () => _post(profile),
                      icon: _posting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                )
              else
                OutlinedButton.icon(
                  onPressed: () => AuthDialog.show(context),
                  icon: const Icon(Icons.login),
                  label: const Text('Ingresar para dejar un mensaje'),
                ),
              const SizedBox(height: 16),
              wallAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('No pudimos cargar el muro: $error'),
                data: (posts) => posts.isEmpty
                    ? const Text(
                        'Todavia no hay mensajes.',
                        style: TextStyle(color: ReadInnColors.muted),
                      )
                    : Column(
                        children: posts
                            .map((post) => _WallPostTile(post: post))
                            .toList(),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ProfileCount extends StatelessWidget {
  final int value;
  final String label;

  const _ProfileCount({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        '$value',
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
      ),
      Text(
        label,
        style: const TextStyle(color: ReadInnColors.muted, fontSize: 11),
      ),
    ],
  );
}

class _StoryRow extends StatelessWidget {
  final StorySummary story;

  const _StoryRow({required this.story});

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 6),
    leading: BookCover(
      title: story.title,
      imageUrl: story.coverColor,
      width: 48,
      height: 72,
    ),
    title: Text(
      story.title,
      style: const TextStyle(fontWeight: FontWeight.w800),
    ),
    subtitle: Text('${story.genre} - ${story.chapterCount} capitulos'),
    trailing: const Icon(Icons.chevron_right_rounded),
    onTap: () => context.push('/story/${story.id}'),
  );
}

class _WallPostTile extends StatelessWidget {
  final WallPost post;

  const _WallPostTile({required this.post});

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: CircleAvatar(
      backgroundColor: ReadInnColors.softOrange,
      child: Text(post.authorName.substring(0, 1).toUpperCase()),
    ),
    title: InkWell(
      onTap: post.authorUsername.isEmpty
          ? null
          : () => context.push('/users/${post.authorUsername}'),
      child: Text(
        post.authorName,
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    subtitle: Padding(
      padding: const EdgeInsets.only(top: 5),
      child: Text(post.body, style: const TextStyle(height: 1.45)),
    ),
  );
}
