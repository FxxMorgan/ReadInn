import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class ReadInnShell extends StatelessWidget {
  final int currentIndex;
  final Widget child;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  const ReadInnShell({
    super.key,
    required this.currentIndex,
    required this.child,
    this.actions,
    this.floatingActionButton,
  });

  void _navigate(BuildContext context, int index) {
    if (index == currentIndex) return;
    const destinations = ['/', '/library', '/writer/dashboard', '/profile'];
    context.push(destinations[index]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/readinn_logo.png',
                width: 28,
                height: 28,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'ReadInn',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: actions,
      ),
      body: SafeArea(child: child),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) => _navigate(context, index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Explorar',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_border),
            selectedIcon: Icon(Icons.bookmark),
            label: 'Biblioteca',
          ),
          NavigationDestination(
            icon: Icon(Icons.edit_note_outlined),
            selectedIcon: Icon(Icons.edit_note),
            label: 'Escribir',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        ),
        if (actionLabel != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    );
  }
}

class BookCover extends StatelessWidget {
  final String title;
  final String? author;
  final String? asset;
  final Color color;
  final double? width;
  final double? height;

  const BookCover({
    super.key,
    required this.title,
    this.author,
    this.asset,
    this.color = ReadInnColors.indigo,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final content = asset == null
        ? _FallbackCover(title: title, author: author, color: color)
        : Image.asset(
            asset!,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                _FallbackCover(title: title, author: author, color: color),
          );
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        boxShadow: [ReadInnColors.bookShadow],
      ),
      clipBehavior: Clip.antiAlias,
      child: content,
    );
  }
}

class _FallbackCover extends StatelessWidget {
  final String title;
  final String? author;
  final Color color;

  const _FallbackCover({
    required this.title,
    required this.author,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color,
            Color.lerp(color, Colors.black, 0.55) ?? Colors.black,
          ],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
              maxLines: 3,
            ),
            if (author != null) ...[
              const SizedBox(height: 6),
              Text(
                author!,
                style: const TextStyle(color: Colors.white70, fontSize: 10),
                maxLines: 1,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final String? delta;
  final IconData icon;

  const MetricTile({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: ReadInnColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Icon(icon, size: 18, color: ReadInnColors.primaryDeep),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            if (delta != null)
              Text(
                delta!,
                style: const TextStyle(
                  color: Color(0xFF15803D),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
