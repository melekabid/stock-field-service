import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/session_storage.dart';
import '../../../shared/models/session_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider), SessionStorage());
});

class AuthRepository {
  AuthRepository(this._client, this._storage);

  final dynamic _client;
  final SessionStorage _storage;

  Future<void> login(String email, String password) async {
    if (_client is! Dio) {
      throw Exception('Client API invalide');
    }

    final dio = _client;
    final origins = {
      if (_storage.currentApiOrigin != null) _storage.currentApiOrigin!,
      ...AppConstants.apiOriginCandidates,
    }.toList();

    DioException? lastDioError;
    Object? lastError;

    for (final origin in origins) {
      try {
        final response = await dio.post(
          '$origin/api/auth/login',
          data: {
            'email': email.trim(),
            'password': password,
          },
          options: Options(
            headers: const {'Content-Type': 'application/json'},
            sendTimeout: const Duration(seconds: 8),
            receiveTimeout: const Duration(seconds: 8),
          ),
        );

        final user = SessionUser.fromJson(Map<String, dynamic>.from(response.data['user'] as Map));
        dio.options.baseUrl = '$origin/api';
        _storage.saveApiOrigin(origin);
        _storage.save(response.data['accessToken'] as String, user);
        return;
      } on DioException catch (error) {
        if (error.response != null) {
          dio.options.baseUrl = '$origin/api';
          _storage.saveApiOrigin(origin);
          rethrow;
        }
        lastDioError = error;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastDioError != null) {
      throw lastDioError;
    }
    if (lastError != null) {
      throw lastError;
    }
    throw Exception('Connexion impossible au backend');
  }
}
