import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageProvider = Provider((ref) => const FlutterSecureStorage());

final dioProvider = Provider((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'http://localhost:3000/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  final storage = ref.watch(secureStorageProvider);

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshToken = await storage.read(key: 'refreshToken');
          if (refreshToken != null) {
            try {
              // Try refreshing access token
              final refreshDio = Dio(BaseOptions(baseUrl: dio.options.baseUrl));
              final response = await refreshDio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );

              final newAccessToken = response.data['data']['accessToken'];
              final newRefreshToken = response.data['data']['refreshToken'];

              await storage.write(key: 'accessToken', value: newAccessToken);
              await storage.write(key: 'refreshToken', value: newRefreshToken);

              // Retry failed request with new access token
              final requestOptions = error.requestOptions;
              requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';

              final retryResponse = await dio.fetch(requestOptions);
              return handler.resolve(retryResponse);
            } catch (_) {
              // Refresh failed, clean up tokens & propagate error
              await storage.delete(key: 'accessToken');
              await storage.delete(key: 'refreshToken');
            }
          }
        }
        return handler.next(error);
      },
    ),
  );

  return dio;
});
