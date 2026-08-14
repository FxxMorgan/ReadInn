import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

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

  factory UserAccount.fromJson(Map<String, dynamic> json) => UserAccount(
    id: json['id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    username: json['username'] as String? ?? '',
    displayName:
        json['displayName'] as String? ??
        json['username'] as String? ??
        'Usuario',
  );

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
  }) => AuthState(
    isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    user: user ?? this.user,
    token: token ?? this.token,
    isLoading: isLoading ?? this.isLoading,
    errorMessage: errorMessage,
  );
}

class AuthNotifier extends StateNotifier<AuthState> {
  static const String _tokenKey = 'auth_jwt_token';
  static const String _userKey = 'auth_user_info';
  final ApiService _apiService = ApiService();

  AuthNotifier() : super(const AuthState()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final userJson = prefs.getString(_userKey);
    if (token == null || userJson == null) return;
    try {
      final user = UserAccount.fromJson(
        jsonDecode(userJson) as Map<String, dynamic>,
      );
      if (user.id == 'user-marina-solis' &&
          token == 'mock-jwt-token-active-session') {
        await logout();
        return;
      }
      state = AuthState(isAuthenticated: true, token: token, user: user);
    } catch (_) {
      await logout();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final data = await _apiService.login(email, password);
      final user = UserAccount.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String? ?? '';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      state = AuthState(isAuthenticated: true, user: user, token: token);
      return true;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage:
            'No pudimos iniciar sesion. Revisa tus datos o la conexion.',
      );
      return false;
    }
  }

  Future<bool> register(
    String email,
    String username,
    String password,
    String displayName,
  ) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final data = await _apiService.register(
        email: email,
        username: username,
        password: password,
        displayName: displayName,
      );
      final user = UserAccount.fromJson(data['user'] as Map<String, dynamic>);
      final token = data['token'] as String? ?? '';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      state = AuthState(isAuthenticated: true, user: user, token: token);
      return true;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'No pudimos crear la cuenta. Revisa los datos.',
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

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
