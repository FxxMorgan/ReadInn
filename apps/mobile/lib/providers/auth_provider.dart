import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

class UserAccount {
  final String id;
  final String email;
  final String username;
  final String displayName;
  final String bio;
  final String? avatarUrl;
  final bool isAdmin;
  final bool adultConfirmed;

  const UserAccount({
    required this.id,
    required this.email,
    required this.username,
    required this.displayName,
    this.bio = '',
    this.avatarUrl,
    this.isAdmin = false,
    this.adultConfirmed = false,
  });

  factory UserAccount.fromJson(Map<String, dynamic> json) => UserAccount(
    id: json['id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    username: json['username'] as String? ?? '',
    displayName:
        json['displayName'] as String? ??
        json['username'] as String? ??
        'Usuario',
    bio: json['bio'] as String? ?? '',
    avatarUrl: json['avatarUrl'] as String?,
    isAdmin: json['isAdmin'] as bool? ?? false,
    adultConfirmed: json['adultConfirmed'] as bool? ?? false,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'username': username,
    'displayName': displayName,
    'bio': bio,
    'avatarUrl': avatarUrl,
    'isAdmin': isAdmin,
    'adultConfirmed': adultConfirmed,
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

  Future<bool> updateProfile({
    required String displayName,
    required String bio,
    String? avatarUrl,
  }) async {
    final current = state.user;
    final token = state.token;
    if (current == null || token == null) return false;
    try {
      final data = await _apiService.updateProfile(
        displayName: displayName,
        bio: bio,
        avatarUrl: avatarUrl,
        token: token,
      );
      final updated = UserAccount(
        id: current.id,
        email: current.email,
        username: current.username,
        displayName: data['displayName'] as String? ?? displayName,
        bio: data['bio'] as String? ?? bio,
        avatarUrl: data['avatarUrl'] as String? ?? avatarUrl,
        isAdmin: current.isAdmin,
        adultConfirmed: current.adultConfirmed,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userKey, jsonEncode(updated.toJson()));
      state = AuthState(isAuthenticated: true, user: updated, token: token);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> confirmAdult() async {
    final current = state.user;
    final token = state.token;
    if (current == null || token == null) return false;
    try {
      await _apiService.confirmAdult(token: token);
      final updated = UserAccount(
        id: current.id,
        email: current.email,
        username: current.username,
        displayName: current.displayName,
        bio: current.bio,
        avatarUrl: current.avatarUrl,
        isAdmin: current.isAdmin,
        adultConfirmed: true,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userKey, jsonEncode(updated.toJson()));
      state = AuthState(isAuthenticated: true, user: updated, token: token);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
