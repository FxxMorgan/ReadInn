import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class UserAccount {
  final String id;
  final String email;
  final String username;
  final String displayName;

  const UserAccount({
    required this.id,
    required this.email,
    required this.username,
    required this.displayName,
  });

  factory UserAccount.fromJson(Map<String, dynamic> json) {
    return UserAccount(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      username: json['username'] as String? ?? '',
      displayName: json['displayName'] as String? ?? json['username'] as String? ?? 'Usuario',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'username': username,
        'displayName': displayName,
      };
}

class AuthState {
  final bool isAuthenticated;
  final UserAccount? user;
  final String? token;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.isAuthenticated = false,
    this.user,
    this.token,
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    UserAccount? user,
    String? token,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  static const String _tokenKey = 'auth_jwt_token';
  static const String _userKey = 'auth_user_info';

  AuthNotifier() : super(const AuthState()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final userJsonStr = prefs.getString(_userKey);

    if (token != null && userJsonStr != null) {
      try {
        final userMap = jsonDecode(userJsonStr) as Map<String, dynamic>;
        state = AuthState(
          isAuthenticated: true,
          token: token,
          user: UserAccount.fromJson(userMap),
        );
      } catch (_) {
        state = const AuthState();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // Simulate/call login API
      await Future.delayed(const Duration(milliseconds: 600));

      final mockUser = UserAccount(
        id: 'user-marina-solis',
        email: email,
        username: email.split('@').first,
        displayName: 'Marina Solís',
      );
      const mockToken = 'mock-jwt-token-active-session';

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, mockToken);
      await prefs.setString(_userKey, jsonEncode(mockUser.toJson()));

      state = AuthState(
        isAuthenticated: true,
        user: mockUser,
        token: mockToken,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Credenciales incorrectas o error de conexión',
      );
      return false;
    }
  }

  Future<bool> register(String email, String username, String password, String displayName) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await Future.delayed(const Duration(milliseconds: 600));

      final newUser = UserAccount(
        id: 'user-new-${DateTime.now().millisecondsSinceEpoch}',
        email: email,
        username: username,
        displayName: displayName.isNotEmpty ? displayName : username,
      );
      const mockToken = 'mock-jwt-token-registered-session';

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, mockToken);
      await prefs.setString(_userKey, jsonEncode(newUser.toJson()));

      state = AuthState(
        isAuthenticated: true,
        user: newUser,
        token: mockToken,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Error al registrar usuario',
      );
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
