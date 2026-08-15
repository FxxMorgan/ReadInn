import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class AuthDialog extends ConsumerStatefulWidget {
  const AuthDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: AuthDialog(),
      ),
    );
  }

  @override
  ConsumerState<AuthDialog> createState() => _AuthDialogState();
}

class _AuthDialogState extends ConsumerState<AuthDialog>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Controllers
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  final _regEmailController = TextEditingController();
  final _regUsernameController = TextEditingController();
  final _regNameController = TextEditingController();
  final _regPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _regEmailController.dispose();
    _regUsernameController.dispose();
    _regNameController.dispose();
    _regPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final authNotifier = ref.read(authProvider.notifier);

    return Container(
      width: 420,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header Logo & Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(
                      'assets/images/readinn_logo.png',
                      width: 34,
                      height: 34,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'ReadInn',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: ReadInnColors.primary,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Tabs: Login vs Register
          TabBar(
            controller: _tabController,
            labelColor: ReadInnColors.primary,
            unselectedLabelColor: ReadInnColors.onSurfaceVariant,
            indicatorColor: ReadInnColors.primary,
            tabs: const [
              Tab(text: 'Iniciar Sesión'),
              Tab(text: 'Crear Cuenta'),
            ],
          ),
          const SizedBox(height: 20),
          if (authState.errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(10),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, size: 16, color: Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      authState.errorMessage!,
                      style: const TextStyle(color: Colors.red, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
          SizedBox(
            height: 320,
            child: TabBarView(
              controller: _tabController,
              children: [
                // Login View
                Column(
                  children: [
                    TextField(
                      controller: _loginEmailController,
                      decoration: const InputDecoration(
                        labelText: 'Correo electrónico',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _loginPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Contraseña',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
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
                        onPressed: authState.isLoading
                            ? null
                            : () async {
                                final success = await authNotifier.login(
                                  _loginEmailController.text.trim(),
                                  _loginPasswordController.text,
                                );
                                if (success && context.mounted) {
                                  Navigator.pop(context);
                                }
                              },
                        child: authState.isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Entrar',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
                // Register View
                SingleChildScrollView(
                  child: Column(
                    children: [
                      TextField(
                        controller: _regEmailController,
                        decoration: const InputDecoration(
                          labelText: 'Correo electrónico',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regUsernameController,
                        decoration: const InputDecoration(
                          labelText: 'Nombre de usuario (@username)',
                          prefixIcon: Icon(Icons.alternate_email),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regNameController,
                        decoration: const InputDecoration(
                          labelText: 'Nombre público (Opcional)',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regPasswordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                      ),
                      const SizedBox(height: 20),
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
                          onPressed: authState.isLoading
                              ? null
                              : () async {
                                  final success = await authNotifier.register(
                                    _regEmailController.text.trim(),
                                    _regUsernameController.text.trim(),
                                    _regPasswordController.text,
                                    _regNameController.text.trim(),
                                  );
                                  if (success && context.mounted) {
                                    Navigator.pop(context);
                                  }
                                },
                          child: authState.isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Registrarme',
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}
